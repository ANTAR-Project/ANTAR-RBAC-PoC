package com.antar.authservice.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

/**
 * Maps to the diagram's "Backup Password Login" box - the fallback path
 * when Verify Biometric Authentication fails or no authenticator is
 * available on the current device. This is intentionally a *separate*
 * table from Credential (WebAuthn public keys) so losing/rotating one
 * factor never touches the other.
 */
@Entity
@Table(name = "password_credentials")
@Getter
@Setter
@NoArgsConstructor
public class PasswordCredential {

    @Id
    private UUID id = UUID.randomUUID();

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash; // BCrypt
}
