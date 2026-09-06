package com.antar.authservice.controller;

import com.antar.authservice.model.PermissionType;
import com.antar.authservice.model.ResourcePermission;
import com.antar.authservice.model.User;
import com.antar.authservice.repository.ResourcePermissionRepository;
import com.antar.authservice.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/permissions")
@RequiredArgsConstructor
public class PermissionController {

    private final ResourcePermissionRepository resourcePermissionRepository;
    private final UserRepository userRepository;

    @PostMapping("/grant")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> grant(
            @RequestParam String username,
            @RequestParam String resourceId,
            @RequestParam PermissionType permission) {
        User user = userRepository.findByUsername(username)
            .orElseThrow(() -> new IllegalArgumentException("Unknown user: " + username));

        ResourcePermission grant = new ResourcePermission();
        grant.setUser(user);
        grant.setResourceId(resourceId);
        grant.setPermission(permission);
        resourcePermissionRepository.save(grant);

        return ResponseEntity.ok().build();
    }
}
