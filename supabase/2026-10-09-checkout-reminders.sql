CREATE TABLE IF NOT EXISTS checkout_reminders (
  order_id uuid PRIMARY KEY REFERENCES orders(id),
  consent_at timestamptz,
  paused boolean NOT NULL DEFAULT false,
  completed boolean NOT NULL DEFAULT false,
  last_checked_at timestamptz,
  legacy_approved boolean NOT NULL DEFAULT false,
  draft_subject text,
  draft_message text,
  active_session_id text,
  attempt_key uuid,
  attempt_at timestamptz,
  token_expires_at timestamptz NOT NULL DEFAULT now() + interval '30 days',
  created_at timestamptz NOT NULL DEFAULT now(),
  last_activity_at timestamptz NOT NULL DEFAULT now(),
  last_error text
);
CREATE TABLE IF NOT EXISTS checkout_recovery_sessions (
  session_id text PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES orders(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS checkout_recovery_order_idx ON checkout_recovery_sessions(order_id);
CREATE TABLE IF NOT EXISTS checkout_reminder_suppressions (
  email_hash text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE checkout_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkout_recovery_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkout_reminder_suppressions ENABLE ROW LEVEL SECURITY;
