package com.antar.authservice.repository;

import com.antar.authservice.model.AccessPolicy;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AccessPolicyRepository extends JpaRepository<AccessPolicy, UUID> {
    List<AccessPolicy> findByServiceKey(String serviceKey);
    Optional<AccessPolicy> findByServiceKeyAndActionAndRole(String serviceKey, String action, String role);
}
