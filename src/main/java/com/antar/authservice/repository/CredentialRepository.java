package com.antar.authservice.repository;

import com.antar.authservice.model.Credential;
import com.antar.authservice.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CredentialRepository extends JpaRepository<Credential, UUID> {
    List<Credential> findByUser(User user);
    Optional<Credential> findByCredentialId(byte[] credentialId);
    List<Credential> findAllByCredentialId(byte[] credentialId);
}
