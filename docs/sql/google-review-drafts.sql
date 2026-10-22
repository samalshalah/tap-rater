BEGIN;
ALTER TABLE google_review_links ADD COLUMN IF NOT EXISTS draft_error text;
ALTER TABLE google_review_links ADD COLUMN IF NOT EXISTS draft_checked_at timestamptz;
ALTER TABLE google_live_reviews ADD COLUMN IF NOT EXISTS draft_generated_at timestamptz;
COMMIT;
