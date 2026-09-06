package com.antar.authservice.controller;

import com.antar.authservice.model.PasswordCredential;
import com.antar.authservice.model.Role;
import com.antar.authservice.model.User;
import com.antar.authservice.repository.CredentialRepository;
import com.antar.authservice.repository.PasswordCredentialRepository;
import com.antar.authservice.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserRepository userRepository;
    private final CredentialRepository credentialRepository;
    private final PasswordCredentialRepository passwordCredentialRepository;
    private final PasswordEncoder passwordEncoder;

    public record UserDto(
        UUID id,
        String username,
        Role role,
        boolean mustChangePassword,
        boolean hasBiometrics,
        boolean hasPassword
    ) {}

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public List<UserDto> listUsers() {
        return userRepository.findAll().stream().map(u -> new UserDto(
            u.getId(),
            u.getUsername(),
            u.getRole(),
            u.isMustChangePassword(),
            !credentialRepository.findByUser(u).isEmpty(),
            passwordCredentialRepository.findByUser(u).isPresent()
        )).collect(Collectors.toList());
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> createUser(
            @RequestParam String username,
            @RequestParam(defaultValue = "USER") Role role,
            @RequestParam String initialPassword) {

        if (userRepository.findByUsername(username).isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("error", "USERNAME_ALREADY_EXISTS"));
        }

        User user = new User(username, role);
        user.setMustChangePassword(true);
        user = userRepository.save(user);

        PasswordCredential cred = new PasswordCredential();
        cred.setUser(user);
        cred.setPasswordHash(passwordEncoder.encode(initialPassword));
        passwordCredentialRepository.save(cred);

        return ResponseEntity.ok(new UserDto(
            user.getId(),
            user.getUsername(),
            user.getRole(),
            user.isMustChangePassword(),
            false,
            true
        ));
    }

    @DeleteMapping("/{username}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deleteUser(@PathVariable String username) {
        if ("admin".equalsIgnoreCase(username)) {
            return ResponseEntity.badRequest().body(Map.of("error", "CANNOT_DELETE_PRIMARY_ADMIN"));
        }
        User user = userRepository.findByUsername(username)
            .orElseThrow(() -> new IllegalArgumentException("User not found: " + username));
        userRepository.delete(user);
        return ResponseEntity.ok(Map.of("message", "USER_DELETED", "username", username));
    }
}
