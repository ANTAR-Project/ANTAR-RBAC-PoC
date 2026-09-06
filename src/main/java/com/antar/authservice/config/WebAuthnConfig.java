package com.antar.authservice.config;

import com.antar.authservice.service.WebAuthnCredentialRepositoryImpl;
import com.yubico.webauthn.RelyingParty;
import com.yubico.webauthn.data.RelyingPartyIdentity;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.Set;

@Configuration
@RequiredArgsConstructor
public class WebAuthnConfig {

    private final WebAuthnCredentialRepositoryImpl credentialRepository;

    @Value("${webauthn.rp-id}")
    private String rpId;

    @Value("${webauthn.rp-name}")
    private String rpName;

    @Value("${webauthn.origin}")
    private String origin;

    @Bean
    public RelyingParty relyingParty() {
        RelyingPartyIdentity identity = RelyingPartyIdentity.builder()
            .id(rpId)     // e.g. "localhost" - no scheme, no port
            .name(rpName)
            .build();

        return RelyingParty.builder()
            .identity(identity)
            .credentialRepository(credentialRepository)
            .origins(Set.of(origin))   // e.g. "http://localhost:5500"
            .allowOriginPort(true)     // relax for local dev across arbitrary ports
            .allowOriginSubdomain(false)
            .build();
    }
}
