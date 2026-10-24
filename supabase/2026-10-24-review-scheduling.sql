ALTER TABLE google_review_links ADD COLUMN IF NOT EXISTS reply_delay_minutes integer NOT NULL DEFAULT 120 CHECK (reply_delay_minutes IN (60,120,360,1440));
ALTER TABLE google_review_links ADD COLUMN IF NOT EXISTS maintenance_due_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE google_live_reviews ADD COLUMN IF NOT EXISTS scheduled_at timestamptz;
ALTER TABLE google_live_reviews ADD COLUMN IF NOT EXISTS scheduled_version integer;
ALTER TABLE google_live_reviews ADD COLUMN IF NOT EXISTS schedule_consent_at timestamptz;
ALTER TABLE google_live_reviews ADD COLUMN IF NOT EXISTS old_reply_requested_at timestamptz;
CREATE INDEX IF NOT EXISTS google_review_schedule_due ON google_live_reviews (scheduled_at,business_id) WHERE scheduled_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS google_review_maintenance_due ON google_review_links (maintenance_due_at) WHERE enabled;
CREATE TABLE IF NOT EXISTS google_review_worker_lease (id integer PRIMARY KEY CHECK (id=1), lease_until timestamptz NOT NULL);
INSERT INTO google_review_worker_lease VALUES (1,'2000-01-01') ON CONFLICT DO NOTHING;

ALTER TABLE google_review_worker_lease ADD COLUMN IF NOT EXISTS token uuid;
ALTER TABLE google_live_reviews ADD COLUMN IF NOT EXISTS schedule_failures integer NOT NULL DEFAULT 0;
