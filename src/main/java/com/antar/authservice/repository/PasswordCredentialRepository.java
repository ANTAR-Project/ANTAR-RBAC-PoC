package com.antar.authservice.repository;

import com.antar.authservice.model.PasswordCredential;
import com.antar.authservice.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface PasswordCredentialRepository extends JpaRepository<PasswordCredential, UUID> {
    Optional<PasswordCredential> findByUser(User user);
}
