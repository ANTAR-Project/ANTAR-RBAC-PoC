package com.antar.authservice.repository;

import com.antar.authservice.model.PermissionType;
import com.antar.authservice.model.ResourcePermission;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface ResourcePermissionRepository extends JpaRepository<ResourcePermission, UUID> {
    List<ResourcePermission> findByUserId(UUID userId);
    boolean existsByUserIdAndResourceIdAndPermission(UUID userId, String resourceId, PermissionType permission);
}
