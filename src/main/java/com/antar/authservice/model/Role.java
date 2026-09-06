package com.antar.authservice.model;

public enum Role {
    ADMIN,   // full access, bypasses ownership checks
    USER,    // access to own private files + general shared content (movies/logs)
    GUEST    // preset access only, defined by an Admin/User via explicit ResourcePermission grants
}
