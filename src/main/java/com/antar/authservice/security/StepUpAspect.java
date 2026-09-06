package com.antar.authservice.security;

import com.antar.authservice.service.TokenService;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

@Aspect
@Component
@RequiredArgsConstructor
public class StepUpAspect {

    private static final String HEADER = "X-Step-Up-Assertion";

    private final TokenService tokenService;

    @Around("@annotation(requiresBiometric)")
    public Object enforce(ProceedingJoinPoint pjp, RequiresBiometric requiresBiometric) throws Throwable {
        HttpServletRequest request =
            ((ServletRequestAttributes) RequestContextHolder.currentRequestAttributes()).getRequest();

        String assertionToken = request.getHeader(HEADER);
        if (assertionToken == null || assertionToken.isBlank()) {
            throw new StepUpRequiredException(requiresBiometric.action());
        }

        Claims claims;
        try {
            claims = tokenService.parse(assertionToken).getBody();
        } catch (JwtException e) {
            // covers expired, malformed, and bad-signature tokens alike
            throw new StepUpRequiredException(requiresBiometric.action());
        }

        boolean isStepUpType = "STEP_UP".equals(claims.get("type"));
        boolean actionMatches = requiresBiometric.action().equals(claims.get("action"));
        if (!isStepUpType || !actionMatches) {
            throw new StepUpRequiredException(requiresBiometric.action());
        }

        return pjp.proceed();
    }
}
