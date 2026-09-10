package com.antar.authservice.config;

import com.antar.authservice.service.WebAuthnCredentialRepositoryImpl;
import com.yubico.webauthn.RelyingParty;
import com.yubico.webauthn.data.RelyingPartyIdentity;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.net.URI;
import java.util.HashSet;
import java.util.Set;

@Configuration
@RequiredArgsConstructor
public class WebAuthnConfig {

    private final WebAuthnCredentialRepositoryImpl credentialRepository;

    @Value("${webauthn.rp-id:localhost}")
    private String defaultRpId;

    @Value("${webauthn.rp-name:ANTAR Auth (PoC)}")
    private String rpName;

    @Value("${webauthn.origin:http://localhost:5500}")
    private String defaultOrigin;

    public RelyingParty getRelyingParty() {
        String effectiveRpId = defaultRpId;
        Set<String> origins = new HashSet<>();
        origins.add(defaultOrigin);
        origins.add("http://localhost:5500");
        origins.add("https://localhost:5500");

        ServletRequestAttributes attrs = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        if (attrs != null) {
            HttpServletRequest request = attrs.getRequest();
            String originHeader = request.getHeader("Origin");
            if (originHeader == null || originHeader.isBlank()) {
                originHeader = request.getHeader("Referer");
            }
            if (originHeader != null && !originHeader.isBlank()) {
                try {
                    URI uri = URI.create(originHeader);
                    String host = uri.getHost();
                    if (host != null && !host.isBlank() && !host.matches("\\d+\\.\\d+\\.\\d+\\.\\d+")) {
                        effectiveRpId = host;
                    }
                    int port = uri.getPort();
                    String originStr = uri.getScheme() + "://" + uri.getHost() + (port > 0 && port != 80 && port != 443 ? ":" + port : "");
                    origins.add(originStr);
                } catch (Exception ignored) {}
            }
        }

        RelyingPartyIdentity identity = RelyingPartyIdentity.builder()
            .id(effectiveRpId)
            .name(rpName)
            .build();

        return RelyingParty.builder()
            .identity(identity)
            .credentialRepository(credentialRepository)
            .origins(origins)
            .allowOriginPort(true)
            .allowOriginSubdomain(true)
            .build();
    }

    @Bean
    public RelyingParty relyingParty() {
        return getRelyingParty();
    }
}
