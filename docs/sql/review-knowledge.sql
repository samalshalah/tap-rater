ALTER TABLE google_review_links ADD COLUMN IF NOT EXISTS review_knowledge jsonb NOT NULL DEFAULT '{}'::jsonb;
