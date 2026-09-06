package com.antar.authservice.service;

import com.antar.authservice.model.*;
import com.antar.authservice.repository.ResourceOwnershipRepository;
import com.antar.authservice.repository.ResourcePermissionRepository;
import com.antar.authservice.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Optional;
import java.util.UUID;

/**
 * Implements the diagram's "Check Role-Based Authorization" through
 * "Action Authorization Confirmed" branch. Note what this class does
 * NOT do: it never checks NAS reachability ("Check NAS Connection
 * Status") - that lives in nas-orchestrator, which is the only service
 * that actually knows if the SMB mount is up. Call this AFTER that
 * check passes.
 *
 * It also does not itself enforce the fresh-biometric requirement for
 * deletions - that's StepUpAspect's job on the controller method
 * (@RequiresBiometric). This class only answers "is this user, by role
 * and ownership, allowed to even attempt this action on this resource."
 */
@Service
@RequiredArgsConstructor
public class PermissionService {

    private final ResourcePermissionRepository resourcePermissionRepository;
    private final ResourceOwnershipRepository resourceOwnershipRepository;
    private final UserRepository userRepository;

    public enum Decision {
        GRANTED_GENERAL,      // "Access Granted: General NAS content, all logs, movies"
        GRANTED_OWN_PRIVATE,  // "Access Granted: Own private files/folders"
        DENIED_NOT_OWNER,     // "Access Denied to this file" (targeting someone else's private file)
        DENIED_DELETION,      // "Action is Deletion? -> Access Denied" (private-file delete needs step-up separately)
        DENIED_NO_GRANT       // Guest/User with no explicit grant for this resource
    }

    public Decision evaluateAccess(UUID userId, String resourceId, PermissionType action) {
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) {
            return Decision.DENIED_NOT_OWNER;
        }

        // Admin: full access, bypasses ownership entirely.
        if (user.getRole() == Role.ADMIN) {
            return Decision.GRANTED_GENERAL;
        }

        Optional<ResourceOwnership> ownership = resourceOwnershipRepository.findByResourceId(resourceId);
        boolean isPrivate = ownership.map(ResourceOwnership::isPrivate).orElse(false);

        if (!isPrivate) {
            // "File Type Access Request" -> folder-icon path -> general content.
            // USER gets it by default; GUEST needs an explicit preset grant.
            if (user.getRole() == Role.USER) {
                return Decision.GRANTED_GENERAL;
            }
            boolean guestGranted = resourcePermissionRepository
                .existsByUserIdAndResourceIdAndPermission(userId, resourceId, action);
            return guestGranted ? Decision.GRANTED_GENERAL : Decision.DENIED_NO_GRANT;
        }

        // Private file path: ownership is mandatory.
        boolean isOwner = ownership.map(o -> o.getOwner().getId().equals(userId)).orElse(false);
        if (!isOwner) {
            return Decision.DENIED_NOT_OWNER;
        }

        // "Action is Deletion?" -> Yes -> Access Denied (here).
        // The controller can still allow deletion, but only by additionally
        // requiring @RequiresBiometric on that endpoint - i.e. the sensitive
        // re-authentication loop is the ONLY way past this specific denial.
        if (action == PermissionType.DELETE) {
            return Decision.DENIED_DELETION;
        }

        return Decision.GRANTED_OWN_PRIVATE;
    }
}
