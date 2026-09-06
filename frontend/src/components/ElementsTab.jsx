import React, { useState, useEffect, useRef } from 'react';
import { Lightbulb, Fan, Lock, ShieldCheck, RefreshCw, Zap, Sun } from 'lucide-react';
import { fetchIoTDevices, sendDeviceControl } from '../api/services';

export default function ElementsTab({ session, showToast }) {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionInProgress, setActionInProgress] = useState({});

  const loadDevices = async () => {
    setLoading(true);
    try {
      const data = await fetchIoTDevices();
      setDevices(data);
    } catch (err) {
      showToast('Could not reach IoT device simulator.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDevices();
    const interval = setInterval(loadDevices, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleDeviceAction = async (serviceKey, actionName, payload) => {
    setActionInProgress((prev) => ({ ...prev, [serviceKey]: true }));
    try {
      showToast(`Transmitting ${actionName} command to ${serviceKey}...`, 'info');
      await sendDeviceControl(serviceKey, actionName, payload, null, session.username);
      showToast(`Command executed successfully on ${serviceKey}.`, 'success');
      await loadDevices();
    } catch (err) {
      showToast(err.message || `Action failed on ${serviceKey}`, 'error');
    } finally {
      setActionInProgress((prev) => ({ ...prev, [serviceKey]: false }));
    }
  };

  const bulb = devices.find((d) => d.id === 'smart-bulb') || {
    id: 'smart-bulb',
    name: 'Living Room Smart Bulb',
    power: false,
    brightness: 80,
    auto_brightness: false,
    ambient_lux: 420,
    color: '#ffd166',
    power_watts: 9.2,
    status: 'ONLINE'
  };

  // Smooth local brightness state to prevent jitter / rubber-banding
  const [localBrightness, setLocalBrightness] = useState(null);
  const isDraggingBrightnessRef = useRef(false);
  const brightnessDebounceTimer = useRef(null);

  useEffect(() => {
    // Only update from incoming device polling if user is not actively dragging the slider
    if (!isDraggingBrightnessRef.current && bulb.brightness !== undefined) {
      setLocalBrightness(bulb.brightness);
    }
  }, [bulb.brightness]);

  const effectiveBrightness = localBrightness !== null ? localBrightness : (bulb.brightness || 80);
  const effectiveWatts = bulb.power ? (2.0 + (effectiveBrightness / 100.0) * 8.0).toFixed(1) : '0.0';

  const handleBrightnessSliderChange = (e) => {
    const val = parseInt(e.target.value, 10);
    setLocalBrightness(val);
    isDraggingBrightnessRef.current = true;

    if (brightnessDebounceTimer.current) {
      clearTimeout(brightnessDebounceTimer.current);
    }

    // Debounce network dispatch by 100ms so drag tracking is silky smooth at 60fps
    brightnessDebounceTimer.current = setTimeout(async () => {
      isDraggingBrightnessRef.current = false;
      try {
        await sendDeviceControl('smart-bulb', 'POWER', { action: 'brightness', value: val }, null, session.username);
      } catch (err) {
        showToast(err.message || 'Failed to adjust brightness', 'error');
      }
    }, 100);
  };

  const handleBrightnessRelease = () => {
    setTimeout(() => {
      isDraggingBrightnessRef.current = false;
    }, 250);
  };

  const handleToggleAutoBrightness = async () => {
    const nextVal = !bulb.auto_brightness;
    try {
      await sendDeviceControl('smart-bulb', 'POWER', { action: 'auto_brightness', value: nextVal }, null, session.username);
      showToast(
        nextVal
          ? '☀️ Auto-Brightness active: Smoothly tracking ambient lux'
          : 'Manual brightness mode restored',
        'info'
      );
      await loadDevices();
    } catch (err) {
      showToast(err.message || 'Failed to toggle Auto-Brightness', 'error');
    }
  };

  const fan = devices.find((d) => d.id === 'smart-fan') || {
    id: 'smart-fan',
    name: 'Master Bedroom Smart Fan',
    power: true,
    speed: 3,
    oscillate: true,
    rpm: 1200,
    status: 'ONLINE'
  };

  const lock = devices.find((d) => d.id === 'smart-lock') || {
    id: 'smart-lock',
    name: 'Main Entry Biometric Deadbolt',
    locked: true,
    battery: 94,
    last_accessed: 'Admin',
    status: 'ARMED'
  };

  return (
    <div>
      <div className="section-header">
        <div className="section-title-wrap">
          <h2>Smart Device Microservices</h2>
          <p>Real-time telemetry and hardware state from simulated IoT edge devices</p>
        </div>
        <button
          className="btn btn-secondary btn-sm"
          onClick={loadDevices}
          disabled={loading}
        >
          <RefreshCw size={14} className={loading ? 'spin' : ''} />
          <span>Refresh Telemetry</span>
        </button>
      </div>

      <div className="device-grid">
        {/* Smart Bulb */}
        <div className={`device-card ${bulb.power ? 'online' : 'offline'}`}>
          <div className="device-card-top">
            <div className="device-meta">
              <span className="device-type-tag">Lighting Element</span>
              <span className="device-title">{bulb.name}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {bulb.auto_brightness && bulb.power && (
                <span
                  className="badge badge-info"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '10px', padding: '3px 8px' }}
                >
                  <Sun size={11} className="spin-slow" />
                  Auto-Lux
                </span>
              )}
              <span className={`badge ${bulb.power ? 'badge-success' : 'badge-danger'}`}>
                <Lightbulb size={12} />
                {bulb.power ? 'ACTIVE' : 'OFF'}
              </span>
            </div>
          </div>

          <div className="device-metrics">
            <div className="metric-row">
              <span>State:</span>
              <strong>{bulb.power ? 'Illuminated' : 'Dark'}</strong>
            </div>
            <div className="metric-row">
              <span>Brightness:</span>
              <strong style={{ color: bulb.power ? '#fef08a' : 'inherit' }}>{effectiveBrightness}%</strong>
            </div>
            <div className="metric-row">
              <span>Power Draw:</span>
              <strong>{effectiveWatts} W</strong>
            </div>
            <div className="metric-row">
              <span>Ambient Sensor:</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}>
                <span
                  style={{
                    width: '7px',
                    height: '7px',
                    borderRadius: '50%',
                    backgroundColor: bulb.auto_brightness ? '#38bdf8' : '#64748b'
                  }}
                />
                <strong>{bulb.ambient_lux ? `${bulb.ambient_lux} Lux` : 'Indoor (420 Lux)'}</strong>
              </span>
            </div>
          </div>

          <div style={{ marginTop: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <label style={{ fontSize: '11px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>Adjust Brightness</span>
                <span style={{ fontFamily: 'var(--font-mono)', color: '#818cf8', fontWeight: 600 }}>({effectiveBrightness}%)</span>
              </label>

              <button
                type="button"
                className={`btn btn-sm ${bulb.auto_brightness ? 'btn-primary' : 'btn-secondary'}`}
                style={{
                  fontSize: '10px',
                  padding: '3px 8px',
                  height: '24px',
                  borderRadius: '6px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
                onClick={handleToggleAutoBrightness}
                title="Toggle smooth automated lux tracking simulator"
              >
                <Sun size={11} />
                <span>Auto-Lux {bulb.auto_brightness ? 'ON' : 'OFF'}</span>
              </button>
            </div>

            <input
              type="range"
              min="1"
              max="100"
              value={effectiveBrightness}
              onChange={handleBrightnessSliderChange}
              onPointerUp={handleBrightnessRelease}
              onTouchEnd={handleBrightnessRelease}
              style={{
                width: '100%',
                accentColor: '#ffd166',
                cursor: 'pointer'
              }}
            />
          </div>

          <div className="device-actions" style={{ marginTop: '12px' }}>
            <button
              className="btn btn-secondary btn-sm"
              style={{ flex: 1 }}
              onClick={() => handleDeviceAction('smart-bulb', 'POWER', { action: 'power', value: !bulb.power })}
              disabled={actionInProgress['smart-bulb']}
            >
              <Lightbulb size={14} />
              {bulb.power ? 'Turn Off' : 'Turn On'}
            </button>
          </div>
        </div>

        {/* Smart Fan */}
        <div className={`device-card ${fan.power ? 'online' : 'offline'}`}>
          <div className="device-card-top">
            <div className="device-meta">
              <span className="device-type-tag">Climate Element</span>
              <span className="device-title">{fan.name}</span>
            </div>
            <span className={`badge ${fan.power ? 'badge-success' : 'badge-danger'}`}>
              <Fan size={12} />
              {fan.power ? 'RUNNING' : 'STOPPED'}
            </span>
          </div>

          <div className="device-metrics">
            <div className="metric-row">
              <span>Speed Setting:</span>
              <strong>Level {fan.speed || 1} of 5</strong>
            </div>
            <div className="metric-row">
              <span>Rotor Velocity:</span>
              <strong>{fan.rpm || 0} RPM</strong>
            </div>
            <div className="metric-row">
              <span>Oscillation:</span>
              <strong>{fan.oscillate ? 'Active (Sweep)' : 'Fixed'}</strong>
            </div>
          </div>

          <div className="device-actions">
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => handleDeviceAction('smart-fan', 'SPEED', { action: 'power', value: !fan.power })}
              disabled={actionInProgress['smart-fan']}
            >
              <Fan size={14} />
              {fan.power ? 'Power Off' : 'Power On'}
            </button>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => handleDeviceAction('smart-fan', 'SPEED', { action: 'speed', value: ((fan.speed || 1) % 5) + 1 })}
              disabled={actionInProgress['smart-fan']}
            >
              <Zap size={14} />
              Speed {((fan.speed || 1) % 5) + 1}
            </button>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => handleDeviceAction('smart-fan', 'SPEED', { action: 'oscillate', value: !fan.oscillate })}
              disabled={actionInProgress['smart-fan']}
            >
              Sweep {fan.oscillate ? 'Off' : 'On'}
            </button>
          </div>
        </div>

        {/* Smart Deadbolt */}
        <div className={`device-card ${lock.locked ? 'offline' : 'online'}`}>
          <div className="device-card-top">
            <div className="device-meta">
              <span className="device-type-tag">Perimeter Security</span>
              <span className="device-title">{lock.name}</span>
            </div>
            <span className={`badge ${lock.locked ? 'badge-danger' : 'badge-success'}`}>
              <Lock size={12} />
              {lock.locked ? 'LOCKED / ARMED' : 'UNLOCKED'}
            </span>
          </div>

          <div className="device-metrics">
            <div className="metric-row">
              <span>Deadbolt Bolt:</span>
              <strong>{lock.locked ? 'Engaged (High Security)' : 'Retracted'}</strong>
            </div>
            <div className="metric-row">
              <span>Reserve Battery:</span>
              <strong>{lock.battery || 94}%</strong>
            </div>
            <div className="metric-row">
              <span>Audit Access:</span>
              <strong style={{ fontSize: '11px' }}>{lock.last_accessed || 'None'}</strong>
            </div>
          </div>

          <div style={{
            background: 'rgba(99, 102, 241, 0.1)',
            border: '1px solid rgba(99, 102, 241, 0.25)',
            borderRadius: 'var(--radius-sm)',
            padding: '8px 12px',
            fontSize: '11px',
            color: '#c7d2fe',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <ShieldCheck size={16} color="#818cf8" style={{ flexShrink: 0 }} />
            <span>Policy: Biometric Step-Up Touch Verification Required to Unlock</span>
          </div>

          <div className="device-actions">
            <button
              className="btn btn-primary btn-sm"
              style={{ flex: 1 }}
              onClick={() => handleDeviceAction('smart-lock', 'UNLOCK', { action: 'unlock', user: session.username })}
              disabled={actionInProgress['smart-lock']}
            >
              <Lock size={14} />
              Unlock (Touch Sensor)
            </button>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => handleDeviceAction('smart-lock', 'UNLOCK', { action: 'lock' })}
              disabled={actionInProgress['smart-lock']}
            >
              Lock Deadbolt
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
