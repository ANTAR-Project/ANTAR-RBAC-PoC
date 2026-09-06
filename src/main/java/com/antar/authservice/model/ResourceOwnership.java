package com.antar.authservice.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

/**
 * Maps directly to the diagram's "File Type Access Request" /
 * "Targeting User's Own Private File?" decision nodes.
 *
 * General shared content (movies, logs) simply has no row here, or a row
 * with isPrivate=false - role-based access alone governs it.
 * Private content (a user's own uploads/folders) has a row with the
 * owner's userId and isPrivate=true - only the owner (or an Admin) may
 * touch it, and even the owner is blocked from deleting it without a
 * fresh step-up assertion (see FileAccessController).
 */
@Entity
@Table(name = "resource_ownership")
@Getter
@Setter
@NoArgsConstructor
public class ResourceOwnership {

    @Id
    private UUID id = UUID.randomUUID();

    @Column(name = "resource_id", nullable = false, unique = true)
    private String resourceId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_user_id", nullable = false)
    private User owner;

    @Column(name = "is_private", nullable = false)
    private boolean isPrivate;
}
