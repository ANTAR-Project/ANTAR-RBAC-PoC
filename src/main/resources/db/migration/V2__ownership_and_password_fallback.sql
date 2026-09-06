CREATE TABLE password_credentials (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    password_hash VARCHAR(100) NOT NULL
);

CREATE TABLE resource_ownership (
    id UUID PRIMARY KEY,
    resource_id VARCHAR(128) NOT NULL UNIQUE,
    owner_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_private BOOLEAN NOT NULL DEFAULT false
);

-- Seed a second, non-admin user for testing the ownership/GUEST paths.
-- Register a WebAuthn credential (or a backup password via
-- POST /auth/password/set) for this username before logging in with it.
INSERT INTO users (id, username, role)
VALUES (gen_random_uuid(), 'alice', 'USER');

-- Seed a general (shared, non-private) resource - any USER should reach it.
INSERT INTO resource_ownership (id, resource_id, owner_user_id, is_private)
SELECT gen_random_uuid(), 'movie-001', id, false FROM users WHERE username = 'admin';

-- Seed a private resource owned by alice - only alice (or an Admin) should
-- reach it, and even alice gets DENIED_DELETION without a step-up assertion.
INSERT INTO resource_ownership (id, resource_id, owner_user_id, is_private)
SELECT gen_random_uuid(), 'alice-private-video', id, true FROM users WHERE username = 'alice';
