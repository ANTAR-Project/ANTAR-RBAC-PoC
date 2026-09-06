package com.antar.authservice.controller;

import com.antar.authservice.service.WebAuthnService;
import com.yubico.webauthn.data.PublicKeyCredentialCreationOptions;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/webauthn/register")
@RequiredArgsConstructor
public class RegistrationController {

    private final WebAuthnService webAuthnService;

    @PostMapping("/start")
    public PublicKeyCredentialCreationOptions start(@RequestParam String username) {
        return webAuthnService.startRegistration(username);
    }

    @PostMapping(value = "/finish", consumes = "application/json")
    public ResponseEntity<Void> finish(@RequestParam String username, @RequestBody String credentialJson) throws Exception {
        webAuthnService.finishRegistration(username, credentialJson);
        return ResponseEntity.ok().build();
    }
}
