ALTER TABLE google_review_links ADD COLUMN IF NOT EXISTS draft_due_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE google_live_reviews ADD COLUMN IF NOT EXISTS auto_schedule_cancelled boolean NOT NULL DEFAULT false;
CREATE TABLE IF NOT EXISTS review_worker_alerts (
 business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
 stage text NOT NULL CHECK(stage IN ('import','draft','publish')),
 failures integer NOT NULL DEFAULT 0,
 updated_at timestamptz NOT NULL DEFAULT now(),
 resolved_at timestamptz,
 emailed_at timestamptz,
 email_attempt_at timestamptz,
 PRIMARY KEY(business_id,stage)
);
CREATE INDEX IF NOT EXISTS review_draft_due_idx ON google_review_links(draft_due_at) WHERE enabled AND ai_consent;
