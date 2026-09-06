-- 1. Remove mock/hardcoded test data (alice, test files)
DELETE FROM resource_ownership WHERE resource_id IN ('movie-001', 'alice-private-video');
DELETE FROM users WHERE username IN ('alice', 'atif', 'user', 'bob');

-- 2. Microservice Catalog
CREATE TABLE microservices (
    service_key VARCHAR(64) PRIMARY KEY,
    display_name VARCHAR(128) NOT NULL,
    category VARCHAR(64) NOT NULL,
    description TEXT
);

INSERT INTO microservices (service_key, display_name, category, description) VALUES
('smart-bulb', 'Living Room Smart Bulb', 'IOT', 'Smart lighting control (Power, Brightness, Color)'),
('smart-fan', 'Master Bedroom Fan', 'IOT', 'Climate ventilation (Power, Speed 1-5, Oscillation)'),
('smart-lock', 'Main Entry Smart Lock', 'SECURITY', 'High-security biometric deadbolt'),
('streaming-svc', 'Video Streaming Proxy', 'MEDIA', 'High-bandwidth local media stream server'),
('nas-storage', 'TrueNAS Storage Cluster', 'STORAGE', 'SMB/NFS volume access and destructive file operations')
ON CONFLICT (service_key) DO NOTHING;

-- 3. Dynamic User-to-Service Permissions
CREATE TABLE service_permissions (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    service_key VARCHAR(64) NOT NULL REFERENCES microservices(service_key) ON DELETE CASCADE,
    permission_level VARCHAR(32) NOT NULL DEFAULT 'CONTROL', -- READ, CONTROL, ADMIN
    UNIQUE(user_id, service_key)
);

-- 4. Preset Default Access & Auth Requirement Policies
CREATE TABLE access_policies (
    id UUID PRIMARY KEY,
    service_key VARCHAR(64) NOT NULL,
    action VARCHAR(64) NOT NULL,
    role VARCHAR(16) NOT NULL,
    auth_requirement VARCHAR(32) NOT NULL DEFAULT 'SESSION', -- NO_AUTH, SESSION, BIOMETRIC_STEP_UP
    UNIQUE(service_key, action, role)
);

-- Seed policy presets:
-- Smart Bulb toggling can be done freely by any authenticated user (or NO_AUTH)
-- Smart Lock and File Deletion strictly require BIOMETRIC_STEP_UP
INSERT INTO access_policies (id, service_key, action, role, auth_requirement) VALUES
(gen_random_uuid(), 'smart-bulb', 'POWER', 'USER', 'NO_AUTH'),
(gen_random_uuid(), 'smart-bulb', 'POWER', 'GUEST', 'SESSION'),
(gen_random_uuid(), 'smart-fan', 'SPEED', 'USER', 'SESSION'),
(gen_random_uuid(), 'smart-fan', 'SPEED', 'GUEST', 'SESSION'),
(gen_random_uuid(), 'smart-lock', 'UNLOCK', 'USER', 'BIOMETRIC_STEP_UP'),
(gen_random_uuid(), 'smart-lock', 'UNLOCK', 'ADMIN', 'BIOMETRIC_STEP_UP'),
(gen_random_uuid(), 'nas-storage', 'DELETE', 'USER', 'BIOMETRIC_STEP_UP'),
(gen_random_uuid(), 'nas-storage', 'DELETE', 'ADMIN', 'BIOMETRIC_STEP_UP')
ON CONFLICT (service_key, action, role) DO NOTHING;
