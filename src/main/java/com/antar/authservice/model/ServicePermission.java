package com.antar.authservice.model;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

@Entity
@Table(name = "service_permissions", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"user_id", "service_key"})
})
@Getter
@Setter
@NoArgsConstructor
public class ServicePermission {

    @Id
    private UUID id = UUID.randomUUID();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "service_key", nullable = false, length = 64)
    private String serviceKey;

    @Column(name = "permission_level", nullable = false, length = 32)
    private String permissionLevel = "CONTROL"; // READ, CONTROL, ADMIN
}
