package com.antar.authservice.security;

public class StepUpRequiredException extends RuntimeException {
    private final String action;

    public StepUpRequiredException(String action) {
        super("Step-up biometric verification required for action: " + action);
        this.action = action;
    }

    public String getAction() {
        return action;
    }
}
