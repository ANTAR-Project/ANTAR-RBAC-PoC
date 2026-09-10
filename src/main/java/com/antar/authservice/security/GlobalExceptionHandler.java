package com.antar.authservice.security;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(StepUpRequiredException.class)
    public ResponseEntity<Map<String, String>> handleStepUpRequired(StepUpRequiredException e) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
            .body(Map.of("error", "STEP_UP_REQUIRED", "action", e.getAction()));
    }

    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<Map<String, String>> handleAccessDenied(AccessDeniedException e) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
            .body(Map.of("error", "ACCESS_DENIED"));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> handleBadRequest(IllegalArgumentException e) {
        return ResponseEntity.badRequest().body(Map.of("error", "BAD_REQUEST", "message", e.getMessage()));
    }

    @ExceptionHandler(com.yubico.webauthn.exception.RegistrationFailedException.class)
    public ResponseEntity<Map<String, String>> handleRegistrationFailed(com.yubico.webauthn.exception.RegistrationFailedException e) {
        return ResponseEntity.badRequest().body(Map.of("error", "REGISTRATION_FAILED", "message", e.getMessage()));
    }

    @ExceptionHandler(com.yubico.webauthn.exception.AssertionFailedException.class)
    public ResponseEntity<Map<String, String>> handleAssertionFailed(com.yubico.webauthn.exception.AssertionFailedException e) {
        return ResponseEntity.badRequest().body(Map.of("error", "ASSERTION_FAILED", "message", e.getMessage()));
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<Map<String, String>> handleConflict(IllegalStateException e) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", "CONFLICT", "message", e.getMessage()));
    }
}
