BEGIN;
CREATE TABLE IF NOT EXISTS google_review_links (
 business_id uuid PRIMARY KEY REFERENCES businesses(id) ON DELETE CASCADE,
 customer_id uuid NOT NULL REFERENCES customers(id),
 owner text NOT NULL,
 google_subject text NOT NULL,
 parent text NOT NULL UNIQUE CHECK (parent ~ '^accounts/[A-Za-z0-9_-]+/locations/[A-Za-z0-9_-]+$'),
 title text NOT NULL,
 enabled boolean NOT NULL DEFAULT true,
 next_page text,
 sync_run uuid,
 sync_lock uuid,
 sync_lock_until timestamptz,
 synced_at timestamptz,
 checked_at timestamptz,
 last_error text,
 ai_consent boolean NOT NULL DEFAULT false,
 auto_enabled boolean NOT NULL DEFAULT false,
 auto_four boolean NOT NULL DEFAULT false,
 auto_five boolean NOT NULL DEFAULT true,
 auto_style text NOT NULL DEFAULT 'friendly' CHECK (auto_style IN ('friendly','professional','personal','short')),
 consent_at timestamptz,
 settings_version integer NOT NULL DEFAULT 1,
 ai_day date,
 ai_calls integer NOT NULL DEFAULT 0,
 ai_last_at timestamptz
);
CREATE TABLE IF NOT EXISTS google_live_reviews (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 business_id uuid NOT NULL REFERENCES google_review_links(business_id) ON DELETE CASCADE,
 resource text NOT NULL UNIQUE,
 data jsonb NOT NULL,
 fetched_at timestamptz NOT NULL DEFAULT now(),
 seen_run uuid,
 draft text NOT NULL DEFAULT '' CHECK (length(draft)<=4000),
 version integer NOT NULL DEFAULT 1,
 publish_state text NOT NULL DEFAULT 'idle' CHECK (publish_state IN ('idle','publishing','uncertain','published')),
 attempted_reply text,
 attempted_at timestamptz,
 attempt_id uuid,
 auto_attempt_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS google_live_reviews_business ON google_live_reviews(business_id);
ALTER TABLE google_review_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE google_live_reviews ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON google_review_links,google_live_reviews FROM PUBLIC;
COMMIT;
