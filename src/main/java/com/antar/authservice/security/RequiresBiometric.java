package com.antar.authservice.security;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Marks an endpoint as requiring a fresh, action-scoped step-up assertion
 * (X-Step-Up-Assertion header) in addition to the normal session JWT.
 * The `action` value must match the "action" claim minted by
 * StepUpController.finish() for this call to succeed.
 */
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface RequiresBiometric {
    String action();
}
