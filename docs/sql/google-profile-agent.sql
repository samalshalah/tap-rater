ALTER TABLE google_review_links ADD COLUMN IF NOT EXISTS profile_ai_enabled boolean NOT NULL DEFAULT false;
