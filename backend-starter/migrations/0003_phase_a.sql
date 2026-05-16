-- Phase A schema updates for IronLog

-- Update users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS username varchar(50) UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url varchar(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS banner_url varchar(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS fitness_goal varchar(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS gender varchar(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS birth_date timestamptz;
ALTER TABLE users ADD COLUMN IF NOT EXISTS height double precision;
ALTER TABLE users ADD COLUMN IF NOT EXISTS experience_level varchar(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Update body_metrics table
ALTER TABLE body_metrics ADD COLUMN IF NOT EXISTS lean_mass double precision;

-- Create password_reset_tokens table
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  varchar(255) NOT NULL,
  expires_at  timestamptz NOT NULL,
  used_at     timestamptz
);

CREATE INDEX IF NOT EXISTS idx_password_reset_user ON password_reset_tokens(user_id);
