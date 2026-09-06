package com.antar.authservice.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

@Entity
@Table(name = "access_policies", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"service_key", "action", "role"})
})
@Getter
@Setter
@NoArgsConstructor
public class AccessPolicy {

    @Id
    private UUID id = UUID.randomUUID();

    @Column(name = "service_key", nullable = false, length = 64)
    private String serviceKey;

    @Column(name = "action", nullable = false, length = 64)
    private String action;

    @Column(name = "role", nullable = false, length = 16)
    private String role; // ADMIN, USER, GUEST

    @Column(name = "auth_requirement", nullable = false, length = 32)
    private String authRequirement = "SESSION"; // NO_AUTH, SESSION, BIOMETRIC_STEP_UP
}
