package com.antar.authservice.controller;

import com.antar.authservice.model.PermissionType;
import com.antar.authservice.security.RequiresBiometric;
import com.antar.authservice.service.PermissionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.Map;
import java.util.UUID;

/**
 * Sandbox for the "File Type Access Request" branch of the diagram.
 * Once wired into the real system, streaming-service/nas-orchestrator
 * would call PermissionService the same way this controller does -
 * this class exists so you can test the decision tree in isolation
 * before touching the video pipeline.
 */
@RestController
@RequestMapping("/files")
@RequiredArgsConstructor
public class FileAccessController {

    private final PermissionService permissionService;

    /** Covers STREAM/ENCODE - any non-deletion action. No step-up required. */
    @GetMapping("/access-check")
    public ResponseEntity<Map<String, String>> checkAccess(
            Principal principal,
            @RequestParam String resourceId,
            @RequestParam PermissionType action) {

        if (action == PermissionType.DELETE) {
            return ResponseEntity.badRequest()
                .body(Map.of("error", "USE_DELETE_ENDPOINT", "message", "Deletion goes through /files/delete, not this check."));
        }

        UUID userId = UUID.fromString(principal.getName());
        PermissionService.Decision decision = permissionService.evaluateAccess(userId, resourceId, action);

        return switch (decision) {
            case GRANTED_GENERAL, GRANTED_OWN_PRIVATE ->
                ResponseEntity.ok(Map.of("decision", decision.name(), "message", "Action Executes"));
            default ->
                ResponseEntity.status(403).body(Map.of("decision", decision.name(), "message", "Access Denied"));
        };
    }

    /**
     * Deletion is always treated as a Sensitive action (per the diagram's
     * own "Sensitive Works" list: 'NAS File Deletion', 'User Deleting Own
     * File'). PermissionService.evaluateAccess() will report
     * DENIED_DELETION for a private file regardless of ownership - this
     * endpoint is the only path that can override that, and only because
     * @RequiresBiometric already forced a fresh fingerprint/FaceID touch
     * before this method body ever runs.
     */
    @DeleteMapping("/delete")
    @RequiresBiometric(action = "DELETE_FILE")
    public ResponseEntity<Map<String, String>> delete(Principal principal, @RequestParam String resourceId) {
        UUID userId = UUID.fromString(principal.getName());
        PermissionService.Decision decision = permissionService.evaluateAccess(userId, resourceId, PermissionType.DELETE);

        // Ownership is still enforced - a valid step-up assertion proves WHO
        // you are, not that you're allowed to delete someone else's file.
        if (decision == PermissionService.Decision.DENIED_NOT_OWNER) {
            return ResponseEntity.status(403).body(Map.of("decision", decision.name(), "message", "Access Denied to this file"));
        }

        // Any other outcome (including the DENIED_DELETION the service
        // returns by default) is overridden here, since the aspect already
        // confirmed a fresh biometric touch scoped exactly to DELETE_FILE.
        return ResponseEntity.ok(Map.of("message", "File deleted (step-up verified)"));
    }
}
