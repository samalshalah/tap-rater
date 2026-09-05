CREATE TABLE IF NOT EXISTS commerce_recovery_jobs (
  id text PRIMARY KEY,
  kind text NOT NULL CHECK (kind IN ('checkout', 'invoice')),
  object_id text NOT NULL,
  stripe_mode text NOT NULL CHECK (stripe_mode IN ('test', 'live')),
  status text NOT NULL CHECK (status IN ('pending', 'failed', 'completed')),
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE commerce_recovery_jobs ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS commerce_recovery_jobs_status_idx ON commerce_recovery_jobs(status, updated_at);
CREATE TABLE IF NOT EXISTS commerce_email_outbox (
  id text PRIMARY KEY,
  entity_id text,
  status text NOT NULL CHECK (status IN ('pending', 'accepted', 'needs_review')),
  payload text,
  first_attempt_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE commerce_email_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS activation_token_ciphertext text;

-- Normalize the empty marker written by the initial JSON/text adapter mapping.
UPDATE commerce_email_outbox SET payload = NULL WHERE status = 'accepted' AND payload = 'null';
