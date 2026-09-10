package com.antar.authservice.security;

import com.antar.authservice.service.TokenService;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class JwtAuthFilter extends OncePerRequestFilter {

    private final TokenService tokenService;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String path = request.getRequestURI();
        String method = request.getMethod();
        String header = request.getHeader("Authorization");

        if (header != null && header.startsWith("Bearer ")) {
            String rawToken = header.substring(7);
            try {
                Claims claims = tokenService.parse(rawToken).getPayload();
                String tokenType = (String) claims.get("type");
                String username = (String) claims.get("username");
                String role = (String) claims.get("role");

                log.debug("[JWT-FILTER] {} {} | Valid '{}' token for user='{}', role='{}'",
                    method, path, tokenType, username, role);

                if ("SESSION".equals(tokenType)) {
                    var authorities = List.of(new SimpleGrantedAuthority("ROLE_" + role));
                    var authentication = new UsernamePasswordAuthenticationToken(
                        claims.getSubject(), null, authorities);
                    SecurityContextHolder.getContext().setAuthentication(authentication);
                    log.trace("[JWT-FILTER] SecurityContext authenticated as principal='{}' with authorities={}",
                        claims.getSubject(), authorities);
                }
            } catch (JwtException ex) {
                log.warn("[JWT-FILTER] {} {} | Invalid or expired JWT token: {}", method, path, ex.getMessage());
                // Invalid/expired session token: leave SecurityContext empty.
                // Downstream @PreAuthorize / permission checks will reject as unauthenticated.
            }
        } else {
            if (path.startsWith("/auth/") || path.startsWith("/webauthn/")) {
                log.debug("[JWT-FILTER] {} {} | Auth ceremony request without Bearer token (Proceeding to public endpoint)",
                    method, path);
            } else {
                log.trace("[JWT-FILTER] {} {} | No Bearer Authorization header present", method, path);
            }
        }

        chain.doFilter(request, response);
    }
}
