package com.antar.authservice.controller;

import com.antar.authservice.model.AccessPolicy;
import com.antar.authservice.model.Microservice;
import com.antar.authservice.model.Role;
import com.antar.authservice.model.ServicePermission;
import com.antar.authservice.model.User;
import com.antar.authservice.repository.AccessPolicyRepository;
import com.antar.authservice.repository.MicroserviceRepository;
import com.antar.authservice.repository.ServicePermissionRepository;
import com.antar.authservice.repository.UserRepository;
import com.antar.authservice.security.StepUpRequiredException;
import com.antar.authservice.service.TokenService;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.security.Principal;
import java.time.Duration;
import java.util.*;

@RestController
@RequestMapping("/api/services")
@RequiredArgsConstructor
public class ServicePermissionController {

    private final MicroserviceRepository microserviceRepository;
    private final ServicePermissionRepository servicePermissionRepository;
    private final AccessPolicyRepository accessPolicyRepository;
    private final UserRepository userRepository;
    private final TokenService tokenService;

    @Value("${device.simulator.url:http://host.docker.internal:5050}")
    private String simulatorUrl;

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(3))
            .build();

    // ---------- Catalog & Permissions ----------

    @GetMapping
    public List<Microservice> listServices() {
        return microserviceRepository.findAll();
    }

    @GetMapping("/permissions/{username}")
    public List<Map<String, String>> getUserPermissions(@PathVariable String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + username));

        return servicePermissionRepository.findByUser(user).stream()
                .map(sp -> Map.of(
                        "serviceKey", sp.getServiceKey(),
                        "permissionLevel", sp.getPermissionLevel()
                ))
                .toList();
    }

    @PostMapping("/permissions/grant")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> grantServicePermission(
            @RequestParam String username,
            @RequestParam String serviceKey,
            @RequestParam(defaultValue = "CONTROL") String permissionLevel) {

        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + username));

        if (!microserviceRepository.existsById(serviceKey)) {
            return ResponseEntity.badRequest().body(Map.of("error", "SERVICE_NOT_FOUND"));
        }

        ServicePermission perm = servicePermissionRepository.findByUserAndServiceKey(user, serviceKey)
                .orElseGet(() -> {
                    ServicePermission sp = new ServicePermission();
                    sp.setUser(user);
                    sp.setServiceKey(serviceKey);
                    return sp;
                });

        perm.setPermissionLevel(permissionLevel);
        servicePermissionRepository.save(perm);

        return ResponseEntity.ok(Map.of("status", "GRANTED", "username", username, "serviceKey", serviceKey));
    }

    @PostMapping("/permissions/revoke")
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional
    public ResponseEntity<?> revokeServicePermission(
            @RequestParam String username,
            @RequestParam String serviceKey) {

        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + username));

        servicePermissionRepository.deleteByUserAndServiceKey(user, serviceKey);
        return ResponseEntity.ok(Map.of("status", "REVOKED", "username", username, "serviceKey", serviceKey));
    }

    // ---------- Policies & Presets ----------

    @GetMapping("/policies")
    public List<AccessPolicy> listPolicies() {
        return accessPolicyRepository.findAll();
    }

    @PostMapping("/policies")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> updatePolicy(
            @RequestParam String serviceKey,
            @RequestParam String action,
            @RequestParam String role,
            @RequestParam String authRequirement) {

        AccessPolicy policy = accessPolicyRepository
                .findByServiceKeyAndActionAndRole(serviceKey, action, role)
                .orElseGet(() -> {
                    AccessPolicy ap = new AccessPolicy();
                    ap.setServiceKey(serviceKey);
                    ap.setAction(action);
                    ap.setRole(role);
                    return ap;
                });

        policy.setAuthRequirement(authRequirement);
        accessPolicyRepository.save(policy);

        return ResponseEntity.ok(policy);
    }

    // ---------- Device Control & Step-Up Relay ----------

    @PostMapping("/device-control")
    public ResponseEntity<?> controlDevice(
            @RequestParam String serviceKey,
            @RequestParam String action,
            @RequestBody(required = false) String payload,
            Principal principal,
            HttpServletRequest request) {

        User user = null;
        if (principal != null) {
            try {
                UUID userId = UUID.fromString(principal.getName());
                user = userRepository.findById(userId).orElse(null);
            } catch (Exception ignored) {}
        }

        String userRole = user != null ? user.getRole().name() : "GUEST";

        // 1. Check Access Policy for Auth Requirement
        Optional<AccessPolicy> policyOpt = accessPolicyRepository.findByServiceKeyAndActionAndRole(serviceKey, action, userRole);
        String req = policyOpt.map(AccessPolicy::getAuthRequirement).orElse("SESSION");

        if ("BIOMETRIC_STEP_UP".equalsIgnoreCase(req)) {
            String stepUpHeader = request.getHeader("X-Step-Up-Assertion");
            if (stepUpHeader == null || stepUpHeader.isBlank()) {
                throw new StepUpRequiredException(action);
            }
            try {
                Claims claims = tokenService.parse(stepUpHeader).getPayload();
                if (!"STEP_UP".equals(claims.get("type")) || !action.equals(claims.get("action"))) {
                    throw new StepUpRequiredException(action);
                }
            } catch (JwtException e) {
                throw new StepUpRequiredException(action);
            }
        } else if ("SESSION".equalsIgnoreCase(req)) {
            if (user == null) {
                return ResponseEntity.status(401).body(Map.of("error", "AUTHENTICATION_REQUIRED"));
            }
        }

        // 2. Check Service Grant (if not Admin and not open)
        if (user != null && user.getRole() != Role.ADMIN) {
            boolean hasGrant = servicePermissionRepository.findByUserAndServiceKey(user, serviceKey).isPresent();
            if (!hasGrant) {
                return ResponseEntity.status(403).body(Map.of(
                        "error", "SERVICE_ACCESS_DENIED",
                        "message", "You do not have granted permissions for service: " + serviceKey
                ));
            }
        }

        // 3. Relay to Python IoT Device Simulator
        try {
            String targetUrl = simulatorUrl + "/api/devices/" + serviceKey + "/control";
            HttpRequest proxyReq = HttpRequest.newBuilder()
                    .uri(URI.create(targetUrl))
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(payload != null ? payload : "{}"))
                    .build();

            HttpResponse<String> proxyRes = httpClient.send(proxyReq, HttpResponse.BodyHandlers.ofString());
            return ResponseEntity.status(proxyRes.statusCode())
                    .header("Content-Type", "application/json")
                    .body(proxyRes.body());
        } catch (Exception e) {
            // Fallback: local simulated response if simulator is temporarily unreachable
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "simulated", true,
                    "serviceKey", serviceKey,
                    "action", action,
                    "status", "ACTION_EXECUTED"
            ));
        }
    }
}
