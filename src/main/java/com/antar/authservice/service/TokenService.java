package com.antar.authservice.service;

import com.antar.authservice.model.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jws;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;
import java.util.UUID;

@Service
public class TokenService {

    @Value("${jwt.signing-secret}")
    private String signingSecret;

    @Value("${jwt.session-ttl-hours:4}")
    private long sessionTtlHours;

    @Value("${jwt.stepup-ttl-seconds:60}")
    private long stepUpTtlSeconds;

    private javax.crypto.SecretKey key() {
        return Keys.hmacShaKeyFor(signingSecret.getBytes(StandardCharsets.UTF_8));
    }

    /** Long-lived token for normal browsing/API access. */
    public String issueSessionToken(User user) {
        return Jwts.builder()
            .setSubject(user.getId().toString())
            .claim("username", user.getUsername())
            .claim("role", user.getRole().name())
            .claim("type", "SESSION")
            .setIssuedAt(new Date())
            .setExpiration(Date.from(Instant.now().plus(sessionTtlHours, ChronoUnit.HOURS)))
            .signWith(key(), SignatureAlgorithm.HS256)
            .compact();
    }

    /**
     * Short-lived, single-purpose assertion proving a fresh biometric touch
     * happened for exactly this action + resource pair. Attach as the
     * X-Step-Up-Assertion header on the retried sensitive request.
     */
    public String issueStepUpAssertion(UUID userId, String action, String resourceId) {
        return Jwts.builder()
            .setSubject(userId.toString())
            .claim("action", action)
            .claim("resourceId", resourceId)
            .claim("type", "STEP_UP")
            .setIssuedAt(new Date())
            .setExpiration(Date.from(Instant.now().plus(stepUpTtlSeconds, ChronoUnit.SECONDS)))
            .signWith(key(), SignatureAlgorithm.HS256)
            .compact();
    }

    /** Throws JwtException (expired/invalid signature/malformed) on any problem. */
    public Jws<Claims> parse(String token) {
        return Jwts.parser().verifyWith(key()).build().parseSignedClaims(token);
    }
}
