-- Apply before deploying the client wizard. No existing drafts are changed.
ALTER TABLE google_live_reviews ADD COLUMN IF NOT EXISTS approved_version integer;
