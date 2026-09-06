package com.antar.authservice.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

@Entity
@Table(name = "resource_permissions", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"user_id", "resource_id", "permission"})
})
@Getter
@Setter
@NoArgsConstructor
public class ResourcePermission {

    @Id
    private UUID id = UUID.randomUUID();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "resource_id", nullable = false)
    private String resourceId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PermissionType permission;
}
