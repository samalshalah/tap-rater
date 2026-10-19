-- Apply with the existing server database owner. No public API access to these tables.
BEGIN;
CREATE TABLE IF NOT EXISTS google_business_connections (
  owner text PRIMARY KEY,
  google_subject text NOT NULL,
  email text NOT NULL,
  access_ciphertext text NOT NULL,
  refresh_ciphertext text NOT NULL,
  expires_at timestamptz NOT NULL,
  scopes text NOT NULL,
  version bigint NOT NULL DEFAULT 1,
  refresh_lock uuid,
  refresh_lock_until timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS google_business_oauth_attempts (
  state_hash text PRIMARY KEY,
  owner text NOT NULL,
  session_hash text NOT NULL,
  verifier_ciphertext text NOT NULL,
  expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS google_business_oauth_attempts_expiry ON google_business_oauth_attempts (expires_at);
ALTER TABLE google_business_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE google_business_oauth_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON google_business_connections, google_business_oauth_attempts FROM PUBLIC;
COMMIT;
