package com.antar.authservice.controller;

import com.antar.authservice.security.RequiresBiometric;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Sandbox endpoints for exercising the auth flow before wiring
 * @RequiresBiometric into the real ANTAR services.
 */
@RestController
@RequestMapping("/demo")
public class DemoController {

    /** Any authenticated user - just proves the session JWT/filter works. */
    @GetMapping("/whoami")
    public ResponseEntity<Map<String, String>> whoAmI(java.security.Principal principal) {
        return ResponseEntity.ok(Map.of("userId", principal.getName()));
    }

    /** Role-gated only, no biometric step-up. */
    @GetMapping("/admin-only")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<String> adminOnly() {
        return ResponseEntity.ok("You are an admin, no fresh biometric touch needed for this one.");
    }

    /** Role-gated AND step-up gated - the pattern for destructive/admin ops. */
    @PostMapping("/sensitive-action")
    @PreAuthorize("hasRole('ADMIN')")
    @RequiresBiometric(action = "SENSITIVE_ACTION")
    public ResponseEntity<String> sensitiveAction() {
        return ResponseEntity.ok("Sensitive action executed - fresh biometric assertion was verified.");
    }
}
