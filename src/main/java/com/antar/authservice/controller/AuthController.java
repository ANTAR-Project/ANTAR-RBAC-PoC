package com.antar.authservice.controller;

import com.antar.authservice.model.User;
import com.antar.authservice.repository.CredentialRepository;
import com.antar.authservice.service.TokenService;
import com.antar.authservice.service.WebAuthnService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/webauthn/login")
@RequiredArgsConstructor
public class AuthController {

    private final WebAuthnService webAuthnService;
    private final TokenService tokenService;
    private final CredentialRepository credentialRepository;

    @PostMapping("/start")
    public ResponseEntity<?> start(@RequestParam String username) {
        User user = webAuthnService.findUser(username).orElse(null);
        if (user == null) {
            return ResponseEntity.status(404).body(Map.of("error", "USER_NOT_FOUND", "message", "User not found: " + username));
        }
        if (credentialRepository.findByUser(user).isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of(
                "error", "NO_BIOMETRICS_ENROLLED",
                "message", "User '" + username + "' has not enrolled biometrics yet. Please sign in with your password first to register your fingerprint."
            ));
        }
        return ResponseEntity.ok(webAuthnService.startAssertion(username).getPublicKeyCredentialRequestOptions());
    }

    @PostMapping(value = "/finish", consumes = "application/json")
    public ResponseEntity<Map<String, String>> finish(@RequestParam String username, @RequestBody String credentialJson) throws Exception {
        webAuthnService.finishAssertion(username, credentialJson);
        User user = webAuthnService.findUser(username)
            .orElseThrow(() -> new IllegalStateException("Unknown user: " + username));
        String token = tokenService.issueSessionToken(user);
        return ResponseEntity.ok(Map.of("token", token, "role", user.getRole().name()));
    }
}
