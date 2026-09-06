package com.antar.authservice.repository;

import com.antar.authservice.model.ServicePermission;
import com.antar.authservice.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ServicePermissionRepository extends JpaRepository<ServicePermission, UUID> {
    List<ServicePermission> findByUser(User user);
    Optional<ServicePermission> findByUserAndServiceKey(User user, String serviceKey);
    void deleteByUserAndServiceKey(User user, String serviceKey);
}
