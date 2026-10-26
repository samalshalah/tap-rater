-- Additive metadata only: no review, reply, draft, or customer records are changed.
-- Existing imports are recognized from saved counts until their next normal completion.
ALTER TABLE google_review_links ADD COLUMN IF NOT EXISTS initial_import_completed_at timestamptz;
