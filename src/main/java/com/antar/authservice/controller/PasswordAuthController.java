package com.antar.authservice.controller;

import com.antar.authservice.model.PasswordCredential;
import com.antar.authservice.model.User;
import com.antar.authservice.repository.PasswordCredentialRepository;
import com.antar.authservice.repository.UserRepository;
import com.antar.authservice.service.TokenService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * Diagram: "Backup Password Login" -> "Password Success?" -> Yes merges back
 * into "Verified Authenticated User"; No -> "Access Denied".
 *
 * Only reachable when biometric verification failed or no authenticator is
 * registered on the current device - the frontend should only surface this
 * as a fallback, not a primary login option, so biometrics stay the default.
 */
@RestController
@RequestMapping("/auth/password")
@RequiredArgsConstructor
public class PasswordAuthController {

    private final UserRepository userRepository;
    private final PasswordCredentialRepository passwordCredentialRepository;
    private final PasswordEncoder passwordEncoder;
    private final TokenService tokenService;

    /** One-time setup so a user HAS a fallback available before they ever need it. */
    @PostMapping("/set")
    public ResponseEntity<Void> setPassword(@RequestParam String username, @RequestParam String password) {
        User user = userRepository.findByUsername(username)
            .orElseThrow(() -> new IllegalArgumentException("Unknown user: " + username));

        PasswordCredential cred = passwordCredentialRepository.findByUser(user).orElseGet(PasswordCredential::new);
        cred.setUser(user);
        cred.setPasswordHash(passwordEncoder.encode(password));
        passwordCredentialRepository.save(cred);

        return ResponseEntity.ok().build();
    }

    @PostMapping("/login")
    public ResponseEntity<Map<String, String>> login(@RequestParam String username, @RequestParam String password) {
        User user = userRepository.findByUsername(username)
            .orElseThrow(() -> new IllegalArgumentException("Unknown user: " + username));

        PasswordCredential cred = passwordCredentialRepository.findByUser(user)
            .orElseThrow(() -> new IllegalStateException("No password fallback set up for: " + username));

        if (!passwordEncoder.matches(password, cred.getPasswordHash())) {
            return ResponseEntity.status(403).body(Map.of("error", "ACCESS_DENIED"));
        }

        // Same session token as the biometric path - "Password Success? Yes"
        // merges back into "Verified Authenticated User" in the diagram.
        String token = tokenService.issueSessionToken(user);
        return ResponseEntity.ok(Map.of(
            "token", token,
            "role", user.getRole().name(),
            "mustChangePassword", String.valueOf(user.isMustChangePassword())
        ));
    }

    @PostMapping("/change")
    public ResponseEntity<Map<String, String>> changePassword(
            @RequestParam String username,
            @RequestParam String oldPassword,
            @RequestParam String newPassword) {
        User user = userRepository.findByUsername(username)
            .orElseThrow(() -> new IllegalArgumentException("Unknown user: " + username));

        PasswordCredential cred = passwordCredentialRepository.findByUser(user)
            .orElseThrow(() -> new IllegalStateException("No password set up for: " + username));

        if (!passwordEncoder.matches(oldPassword, cred.getPasswordHash())) {
            return ResponseEntity.status(400).body(Map.of("error", "OLD_PASSWORD_INCORRECT"));
        }

        cred.setPasswordHash(passwordEncoder.encode(newPassword));
        passwordCredentialRepository.save(cred);

        user.setMustChangePassword(false);
        userRepository.save(user);

        String token = tokenService.issueSessionToken(user);
        return ResponseEntity.ok(Map.of(
            "message", "PASSWORD_CHANGED",
            "token", token,
            "role", user.getRole().name(),
            "mustChangePassword", "false"
        ));
    }
}
