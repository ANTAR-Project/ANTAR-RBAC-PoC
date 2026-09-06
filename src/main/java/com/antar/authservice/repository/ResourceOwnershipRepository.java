package com.antar.authservice.repository;

import com.antar.authservice.model.ResourceOwnership;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface ResourceOwnershipRepository extends JpaRepository<ResourceOwnership, UUID> {
    Optional<ResourceOwnership> findByResourceId(String resourceId);
}
