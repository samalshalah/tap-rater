CREATE TABLE IF NOT EXISTS client_failures (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 fingerprint text NOT NULL UNIQUE,
 customer_id uuid REFERENCES customers(id) ON DELETE SET NULL,
 business_id uuid REFERENCES businesses(id) ON DELETE SET NULL,
 source text NOT NULL CHECK(source IN ('request','browser','background')),
 code text NOT NULL, path text NOT NULL, http_status integer,
 occurrences bigint NOT NULL DEFAULT 1,
 first_seen timestamptz NOT NULL DEFAULT now(), last_seen timestamptz NOT NULL DEFAULT now(),
 resolved_at timestamptz, notified_at timestamptz, notification_attempt_at timestamptz,
 notification_error text
);
CREATE INDEX IF NOT EXISTS client_failures_recent ON client_failures(last_seen DESC);
ALTER TABLE client_failures ENABLE ROW LEVEL SECURITY;
