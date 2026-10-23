ALTER TABLE google_review_links ADD COLUMN IF NOT EXISTS review_total integer CHECK (review_total >= 0);
