ALTER TABLE google_review_links ADD COLUMN IF NOT EXISTS draft_low_stars boolean NOT NULL DEFAULT true;
