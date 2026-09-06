-- Add flag to enforce password change on initial login
ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT false;

-- Force admin to change password on first setup
UPDATE users SET must_change_password = true WHERE username = 'admin';

-- Seed initial out-of-the-box passkey for admin: "welcome_to_AN|TAR."
-- BCrypt hash generated with strength 10
INSERT INTO password_credentials (id, user_id, password_hash)
SELECT gen_random_uuid(), id, '$2a$10$w7ky3pXbaOssUHBm/DJG8.BIvo2QQpeE77tXaGI/cJzVTzuthYT8i'
FROM users WHERE username = 'admin'
ON CONFLICT (user_id) DO UPDATE SET password_hash = EXCLUDED.password_hash;
