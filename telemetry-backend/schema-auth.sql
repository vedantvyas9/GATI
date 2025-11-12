-- Authentication tables for GATI telemetry

-- Table to store verification codes
CREATE TABLE IF NOT EXISTS gati_verification_codes (
    email VARCHAR(255) PRIMARY KEY,
    code_hash VARCHAR(64) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    attempts INTEGER DEFAULT 0,
    verified BOOLEAN DEFAULT FALSE
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_verification_expires ON gati_verification_codes(expires_at);

-- Table to store authenticated users and their API tokens
CREATE TABLE IF NOT EXISTS gati_users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    api_token VARCHAR(64) UNIQUE NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    last_active TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Index for API token lookups
CREATE INDEX IF NOT EXISTS idx_users_api_token ON gati_users(api_token);
CREATE INDEX IF NOT EXISTS idx_users_email ON gati_users(email);

-- Add user_email column to gati_metrics to track which user sent the metrics
ALTER TABLE gati_metrics ADD COLUMN IF NOT EXISTS user_email VARCHAR(255);
CREATE INDEX IF NOT EXISTS idx_metrics_user_email ON gati_metrics(user_email);
