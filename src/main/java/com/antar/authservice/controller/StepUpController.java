package com.antar.authservice.controller;

import com.antar.authservice.model.User;
import com.antar.authservice.service.TokenService;
import com.antar.authservice.service.WebAuthnService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/webauthn/stepup")
@RequiredArgsConstructor
public class StepUpController {

    private final WebAuthnService webAuthnService;
    private final TokenService tokenService;

    @PostMapping("/start")
    public com.yubico.webauthn.data.PublicKeyCredentialRequestOptions start(@RequestParam String username) {
        // Same WebAuthn assertion ceremony as login - what differs is the
        // token minted afterward (short-lived + action/resource-scoped).
        return webAuthnService.startAssertion(username).getPublicKeyCredentialRequestOptions();
    }

    @PostMapping(value = "/finish", consumes = "application/json")
    public ResponseEntity<Map<String, String>> finish(
            @RequestParam String username,
            @RequestParam String action,
            @RequestParam String resourceId,
            @RequestBody String credentialJson) throws Exception {
        webAuthnService.finishAssertion(username, credentialJson);
        User user = webAuthnService.findUser(username)
            .orElseThrow(() -> new IllegalStateException("Unknown user: " + username));
        String assertion = tokenService.issueStepUpAssertion(user.getId(), action, resourceId);
        return ResponseEntity.ok(Map.of("assertion", assertion));
    }
}
