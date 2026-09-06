CREATE TABLE users (
    id UUID PRIMARY KEY,
    username VARCHAR(64) UNIQUE NOT NULL,
    role VARCHAR(16) NOT NULL DEFAULT 'USER'
);

CREATE TABLE credentials (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    credential_id BYTEA NOT NULL,
    public_key_cose BYTEA NOT NULL,
    signature_count BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_credentials_user_id ON credentials(user_id);

CREATE TABLE resource_permissions (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    resource_id VARCHAR(128) NOT NULL,
    permission VARCHAR(32) NOT NULL,
    UNIQUE(user_id, resource_id, permission)
);

-- Seed one admin for local testing. Register a WebAuthn credential for
-- this username first via /webauthn/register, since login requires one.
INSERT INTO users (id, username, role)
VALUES (gen_random_uuid(), 'admin', 'ADMIN');
