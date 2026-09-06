package com.antar.authservice.service;

import com.antar.authservice.model.User;
import com.antar.authservice.repository.UserRepository;
import com.yubico.webauthn.CredentialRepository;
import com.yubico.webauthn.RegisteredCredential;
import com.yubico.webauthn.data.ByteArray;
import com.yubico.webauthn.data.PublicKeyCredentialDescriptor;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Bridges Yubico's webauthn-server-core CredentialRepository interface
 * to our JPA-backed storage. This is the class the RelyingParty bean
 * depends on for looking up registered authenticators during both
 * registration and assertion (login/step-up) ceremonies.
 */
@Component
@RequiredArgsConstructor
public class WebAuthnCredentialRepositoryImpl implements CredentialRepository {

    private final UserRepository userRepository;
    private final com.antar.authservice.repository.CredentialRepository credentialRepository;

    @Override
    public Set<PublicKeyCredentialDescriptor> getCredentialIdsForUsername(String username) {
        return userRepository.findByUsername(username)
            .map(user -> credentialRepository.findByUser(user).stream()
                .map(cred -> PublicKeyCredentialDescriptor.builder()
                    .id(new ByteArray(cred.getCredentialId()))
                    .build())
                .collect(Collectors.toSet()))
            .orElse(Set.of());
    }

    @Override
    public Optional<ByteArray> getUserHandleForUsername(String username) {
        return userRepository.findByUsername(username)
            .map(user -> new ByteArray(user.getId().toString().getBytes(StandardCharsets.UTF_8)));
    }

    @Override
    public Optional<String> getUsernameForUserHandle(ByteArray userHandle) {
        try {
            UUID id = UUID.fromString(new String(userHandle.getBytes(), StandardCharsets.UTF_8));
            return userRepository.findById(id).map(User::getUsername);
        } catch (IllegalArgumentException e) {
            return Optional.empty();
        }
    }

    @Override
    public Optional<RegisteredCredential> lookup(ByteArray credentialId, ByteArray userHandle) {
        return credentialRepository.findByCredentialId(credentialId.getBytes())
            .map(this::toRegisteredCredential);
    }

    @Override
    public Set<RegisteredCredential> lookupAll(ByteArray credentialId) {
        return credentialRepository.findAllByCredentialId(credentialId.getBytes()).stream()
            .map(this::toRegisteredCredential)
            .collect(Collectors.toSet());
    }

    private RegisteredCredential toRegisteredCredential(com.antar.authservice.model.Credential cred) {
        return RegisteredCredential.builder()
            .credentialId(new ByteArray(cred.getCredentialId()))
            .userHandle(new ByteArray(cred.getUser().getId().toString().getBytes(StandardCharsets.UTF_8)))
            .publicKeyCose(new ByteArray(cred.getPublicKeyCose()))
            .signatureCount(cred.getSignatureCount())
            .build();
    }
}
