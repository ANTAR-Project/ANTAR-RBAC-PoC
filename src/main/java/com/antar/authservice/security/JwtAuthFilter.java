package com.antar.authservice.security;

import com.antar.authservice.service.TokenService;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

@Component
@RequiredArgsConstructor
public class JwtAuthFilter extends OncePerRequestFilter {

    private final TokenService tokenService;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String header = request.getHeader("Authorization");

        if (header != null && header.startsWith("Bearer ")) {
            try {
                Claims claims = tokenService.parse(header.substring(7)).getBody();
                if ("SESSION".equals(claims.get("type"))) {
                    var authorities = List.of(new SimpleGrantedAuthority("ROLE_" + claims.get("role")));
                    var authentication = new UsernamePasswordAuthenticationToken(
                        claims.getSubject(), null, authorities);
                    SecurityContextHolder.getContext().setAuthentication(authentication);
                }
            } catch (JwtException ignored) {
                // Invalid/expired session token: leave SecurityContext empty.
                // Downstream @PreAuthorize / permission checks will reject as unauthenticated.
            }
        }

        chain.doFilter(request, response);
    }
}
