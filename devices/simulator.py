#!/usr/bin/env python3
"""
ANTAR IoT Microservices Hardware Emulator
Emulates real-world smart devices: Smart Bulb, Smart Fan, Smart Deadbolt.
Serves REST API on port 5050 with CORS enabled and live event logging.
"""

from http.server import HTTPServer, BaseHTTPRequestHandler
import json
import urllib.parse
import datetime
import sys
import threading
import time
import math
import random

# In-memory hardware telemetry state
DEVICES = {
    "smart-bulb": {
        "id": "smart-bulb",
        "name": "Living Room Smart Bulb",
        "type": "LIGHTING",
        "power": True,
        "brightness": 80,
        "auto_brightness": False,
        "ambient_lux": 420,
        "color": "#ffd166",
        "power_watts": 9.2,
        "status": "ONLINE"
    },
    "smart-fan": {
        "id": "smart-fan",
        "name": "Master Bedroom Smart Fan",
        "type": "CLIMATE",
        "power": True,
        "speed": 3,
        "mode": "Breeze",
        "oscillate": True,
        "rpm": 1200,
        "status": "ONLINE"
    },
    "smart-lock": {
        "id": "smart-lock",
        "name": "Main Entry Biometric Deadbolt",
        "type": "SECURITY",
        "locked": True,
        "battery": 94,
        "last_accessed": "Admin (Verified Touch ID)",
        "status": "ARMED"
    }
}

EVENT_LOGS = []

def log_event(device_id, event_type, message, details=None):
    now = datetime.datetime.now()
    timestamp_str = now.strftime("%H:%M:%S.%f")[:-3]
    date_str = now.strftime("%Y-%m-%d %H:%M:%S")

    entry = {
        "id": len(EVENT_LOGS) + 1,
        "timestamp": timestamp_str,
        "full_time": date_str,
        "device": device_id,
        "type": event_type,
        "message": message,
        "details": details or {}
    }
    EVENT_LOGS.append(entry)
    if len(EVENT_LOGS) > 150:
        EVENT_LOGS.pop(0)

    # ANSI Colors for terminal clarity
    CYAN = "\033[36m"
    GREEN = "\033[32m"
    YELLOW = "\033[33m"
    MAGENTA = "\033[35m"
    RED = "\033[31m"
    RESET = "\033[0m"
    BOLD = "\033[1m"

    color = GREEN
    if device_id == "smart-lock":
        color = MAGENTA if "UNLOCK" in event_type else YELLOW
    elif device_id == "smart-fan":
        color = CYAN
    elif device_id == "smart-bulb":
        color = YELLOW

    print(f"{BOLD}[{timestamp_str}]{RESET} {color}[{device_id.upper()}]{RESET} {message}", flush=True)
    if details:
        print(f"       ↳ Details: {json.dumps(details)}", flush=True)

class IoTRequestHandler(BaseHTTPRequestHandler):
    def _send_cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Step-Up-Assertion")

    def do_OPTIONS(self):
        self.send_response(200)
        self._send_cors_headers()
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path in ("/api/devices", "/devices"):
            self.send_response(200)
            self._send_cors_headers()
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps(list(DEVICES.values())).encode("utf-8"))
        elif parsed.path in ("/api/logs", "/logs"):
            self.send_response(200)
            self._send_cors_headers()
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            # Return newest logs first
            self.wfile.write(json.dumps(list(reversed(EVENT_LOGS[-50:]))).encode("utf-8"))
        elif parsed.path.startswith("/api/devices/"):
            device_id = parsed.path.split("/")[-1]
            if device_id in DEVICES:
                self.send_response(200)
                self._send_cors_headers()
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps(DEVICES[device_id]).encode("utf-8"))
            else:
                self.send_response(404)
                self._send_cors_headers()
                self.end_headers()
        else:
            self.send_response(404)
            self._send_cors_headers()
            self.end_headers()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        parts = parsed.path.strip("/").split("/")
        
        # /api/devices/{id}/control
        if len(parts) >= 3 and parts[0] == "api" and parts[1] == "devices" and parts[-1] == "control":
            device_id = parts[2]
            if device_id not in DEVICES:
                self.send_response(404)
                self._send_cors_headers()
                self.end_headers()
                return

            length = int(self.headers.get("Content-Length", 0))
            body = json.loads(self.rfile.read(length).decode("utf-8")) if length > 0 else {}
            action = body.get("action")
            value = body.get("value")

            device = DEVICES[device_id]
            if action == "power":
                device["power"] = bool(value)
                state_text = "POWER ON" if device["power"] else "POWER OFF"
                if device_id == "smart-fan":
                    device["rpm"] = 1200 if device["power"] else 0
                    log_event(device_id, "POWER", f"Fan {state_text} (RPM: {device['rpm']})", {"power": device["power"], "rpm": device["rpm"]})
                else:
                    log_event(device_id, "POWER", f"Bulb {state_text} (Draw: {device.get('power_watts', 0)}W)", {"power": device["power"]})

            elif action == "brightness" and device_id == "smart-bulb":
                device["auto_brightness"] = False
                device["brightness"] = max(1, min(100, int(value)))
                device["power_watts"] = round(2.0 + (device["brightness"] / 100.0) * 8.0, 1)
                log_event(device_id, "BRIGHTNESS", f"Brightness manually adjusted to {device['brightness']}% ({device['power_watts']}W power draw)", {"brightness": device["brightness"], "watts": device["power_watts"]})

            elif action == "auto_brightness" and device_id == "smart-bulb":
                device["auto_brightness"] = bool(value)
                state_str = "ENABLED (Smooth Ambient Lux Tracking)" if device["auto_brightness"] else "DISABLED (Manual Mode)"
                log_event(device_id, "AUTO_BRIGHTNESS", f"Auto-Brightness {state_str}", {"auto_brightness": device["auto_brightness"], "ambient_lux": device.get("ambient_lux", 420)})

            elif action == "color" and device_id == "smart-bulb":
                device["color"] = str(value)
                log_event(device_id, "COLOR", f"Color tint changed to {device['color']}", {"color": device["color"]})

            elif action == "speed" and device_id == "smart-fan":
                device["speed"] = max(1, min(5, int(value)))
                device["rpm"] = device["speed"] * 400
                log_event(device_id, "SPEED", f"Speed set to Level {device['speed']} (Motor: {device['rpm']} RPM)", {"speed": device["speed"], "rpm": device["rpm"]})

            elif action == "oscillate" and device_id == "smart-fan":
                device["oscillate"] = bool(value)
                osc_text = "ENABLED (90° Sweep)" if device["oscillate"] else "DISABLED (Fixed Direction)"
                log_event(device_id, "OSCILLATION", f"Oscillation {osc_text}", {"oscillate": device["oscillate"]})

            elif action == "unlock" and device_id == "smart-lock":
                device["locked"] = False
                user = body.get("user", "Authorized User")
                device["last_accessed"] = f"{user} (Biometric Step-Up Verified)"
                log_event(device_id, "UNLOCK_SUCCESS", f"🔓 DEADBOLT UNLOCKED by '{user}' [Verified Hardware Biometric Step-Up]", {"user": user, "status": "UNLOCKED"})

            elif action == "lock" and device_id == "smart-lock":
                device["locked"] = True
                log_event(device_id, "LOCK_ENGAGED", "🔒 DEADBOLT SECURED / LOCKED (Perimeter Armed)", {"status": "ARMED"})

            self.send_response(200)
            self._send_cors_headers()
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"success": True, "device": device}).encode("utf-8"))
        else:
            self.send_response(404)
            self._send_cors_headers()
            self.end_headers()

    def log_message(self, format, *args):
        # Override BaseHTTPRequestHandler default stderr logging to keep terminal output clean
        pass

def ambient_sensor_daemon():
    """Simulates smooth ambient lux drift and gentle auto-brightness adaptation in the background"""
    step = 0.0
    last_logged_brightness = -1
    while True:
        try:
            time.sleep(1.2)
            step += 0.06
            bulb = DEVICES.get("smart-bulb")
            if not bulb or not bulb.get("power"):
                continue

            if bulb.get("auto_brightness"):
                # Smooth continuous diurnal wave (200 to 750 Lux) + slight analog flicker (±5 lux)
                base_lux = 475.0 + 260.0 * math.sin(step) + random.uniform(-6, 6)
                lux = max(100, min(850, int(base_lux)))
                bulb["ambient_lux"] = lux

                # Compute target brightness for the ambient lighting
                # Low ambient light (150 lux) -> soft 35% brightness
                # High ambient light (750 lux) -> crisp 85% brightness
                target = int(25 + (lux / 850.0) * 65)
                target = max(20, min(95, target))

                curr = bulb.get("brightness", 80)
                diff = target - curr

                # Smoothly glide towards target by at most 1-2% per step (super smooth, zero jarring steps)
                if abs(diff) >= 1:
                    delta = 1 if diff > 0 else -1
                    if abs(diff) >= 6:
                        delta = 2 if diff > 0 else -2
                    
                    next_bright = curr + delta
                    bulb["brightness"] = next_bright
                    bulb["power_watts"] = round(2.0 + (next_bright / 100.0) * 8.0, 1)

                    # Log periodically or upon significant movement (every ~8 steps)
                    if abs(next_bright - last_logged_brightness) >= 6 or last_logged_brightness == -1:
                        last_logged_brightness = next_bright
                        log_event(
                            "smart-bulb",
                            "AUTO_LUX",
                            f"Ambient Sensor: {lux} Lux ➔ Smooth calibrated brightness to {next_bright}% ({bulb['power_watts']}W)",
                            {"ambient_lux": lux, "brightness": next_bright, "watts": bulb["power_watts"]}
                        )
        except Exception:
            pass

if __name__ == "__main__":
    PORT = 5050
    print("=" * 65, flush=True)
    print(f"[*] ANTAR IoT Device Simulator online at http://localhost:{PORT}", flush=True)
    print("[*] Ready to receive hardware control events from Frontend mesh.", flush=True)
    print("=" * 65, flush=True)
    log_event("SYSTEM", "INIT", "Hardware simulation daemon initialized with 3 edge devices (Bulb, Fan, Deadbolt).")

    # Start smooth ambient sensor auto-brightness daemon
    bg_thread = threading.Thread(target=ambient_sensor_daemon, daemon=True)
    bg_thread.start()

    server = HTTPServer(("0.0.0.0", PORT), IoTRequestHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n[*] Shutting down IoT simulator daemon.")
