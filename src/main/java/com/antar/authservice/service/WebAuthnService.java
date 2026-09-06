package com.antar.authservice.service;

import com.antar.authservice.model.Credential;
import com.antar.authservice.model.Role;
import com.antar.authservice.model.User;
import com.antar.authservice.repository.CredentialRepository;
import com.antar.authservice.repository.UserRepository;
import com.yubico.webauthn.*;
import com.yubico.webauthn.data.*;
import com.yubico.webauthn.exception.AssertionFailedException;
import com.yubico.webauthn.exception.RegistrationFailedException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
public class WebAuthnService {

    private final RelyingParty relyingParty;
    private final UserRepository userRepository;
    private final CredentialRepository credentialRepository;

    // In-memory challenge cache keyed by username, PoC only.
    // Swap for Redis (with a short TTL) before this goes anywhere near production
    // or a multi-instance deployment.
    private final Map<String, PublicKeyCredentialCreationOptions> pendingRegistrations = new ConcurrentHashMap<>();
    private final Map<String, AssertionRequest> pendingAssertions = new ConcurrentHashMap<>();

    // ---------- Registration ----------

    public PublicKeyCredentialCreationOptions startRegistration(String username) {
        User user = userRepository.findByUsername(username)
            .orElseGet(() -> userRepository.save(new User(username, Role.USER)));

        UserIdentity identity = UserIdentity.builder()
            .name(username)
            .displayName(username)
            .id(new ByteArray(user.getId().toString().getBytes(StandardCharsets.UTF_8)))
            .build();

        PublicKeyCredentialCreationOptions options = relyingParty.startRegistration(
            StartRegistrationOptions.builder()
                .user(identity)
                .authenticatorSelection(AuthenticatorSelectionCriteria.builder()
                    // REQUIRED forces the authenticator to actually perform a
                    // biometric/PIN check, not just confirm "a key is present".
                    .userVerification(UserVerificationRequirement.REQUIRED)
                    .build())
                .build());

        pendingRegistrations.put(username, options);
        return options;
    }

    public void finishRegistration(String username, String credentialJson) throws RegistrationFailedException {
        PublicKeyCredentialCreationOptions options = pendingRegistrations.remove(username);
        if (options == null) {
            throw new IllegalStateException("No pending registration for username: " + username);
        }

        PublicKeyCredential<AuthenticatorAttestationResponse, ClientRegistrationExtensionOutputs> pkc;
        try {
            pkc = PublicKeyCredential.parseRegistrationResponseJson(credentialJson);
        } catch (Exception e) {
            throw new IllegalArgumentException("Malformed registration response JSON", e);
        }

        RegistrationResult result = relyingParty.finishRegistration(
            FinishRegistrationOptions.builder()
                .request(options)
                .response(pkc)
                .build());

        User user = userRepository.findByUsername(username)
            .orElseThrow(() -> new IllegalStateException("User disappeared mid-registration: " + username));

        Credential cred = new Credential();
        cred.setUser(user);
        cred.setCredentialId(result.getKeyId().getId().getBytes());
        cred.setPublicKeyCose(result.getPublicKeyCose().getBytes());
        cred.setSignatureCount(result.getSignatureCount());
        credentialRepository.save(cred);
    }

    // ---------- Login / step-up (both use the same assertion ceremony) ----------

    public AssertionRequest startAssertion(String username) {
        AssertionRequest request = relyingParty.startAssertion(
            StartAssertionOptions.builder()
                .username(username)
                .userVerification(UserVerificationRequirement.REQUIRED)
                .build());
        pendingAssertions.put(username, request);
        return request;
    }

    public AssertionResult finishAssertion(String username, String credentialJson) throws AssertionFailedException {
        AssertionRequest request = pendingAssertions.remove(username);
        if (request == null) {
            throw new IllegalStateException("No pending assertion for username: " + username);
        }

        PublicKeyCredential<AuthenticatorAssertionResponse, ClientAssertionExtensionOutputs> pkc;
        try {
            pkc = PublicKeyCredential.parseAssertionResponseJson(credentialJson);
        } catch (Exception e) {
            throw new IllegalArgumentException("Malformed assertion response JSON", e);
        }

        AssertionResult result = relyingParty.finishAssertion(
            FinishAssertionOptions.builder()
                .request(request)
                .response(pkc)
                .build());

        if (!result.isSuccess()) {
            throw new IllegalStateException("Assertion did not succeed for username: " + username);
        }

        // Update the stored signature counter to guard against cloned authenticators.
        credentialRepository.findByCredentialId(pkc.getId().getBytes())
            .ifPresent(cred -> {
                cred.setSignatureCount(result.getSignatureCount());
                credentialRepository.save(cred);
            });

        return result;
    }

    public Optional<User> findUser(String username) {
        return userRepository.findByUsername(username);
    }
}
