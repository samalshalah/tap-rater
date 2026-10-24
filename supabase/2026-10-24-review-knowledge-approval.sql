ALTER TABLE google_review_links ADD COLUMN IF NOT EXISTS review_knowledge_approved_at timestamptz;
ALTER TABLE google_review_links ALTER COLUMN draft_low_stars SET DEFAULT false;
UPDATE google_review_links SET draft_low_stars=false,settings_version=settings_version+1 WHERE review_knowledge_approved_at IS NULL AND draft_low_stars;
