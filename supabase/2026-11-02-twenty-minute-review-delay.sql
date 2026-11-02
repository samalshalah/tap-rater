BEGIN;
ALTER TABLE google_review_links DROP CONSTRAINT IF EXISTS google_review_links_reply_delay_minutes_check;
ALTER TABLE google_review_links ADD CONSTRAINT google_review_links_reply_delay_minutes_check
  CHECK (reply_delay_minutes IN (20,60,120,360,1440));
ALTER TABLE google_review_links ALTER COLUMN reply_delay_minutes SET DEFAULT 20;
COMMIT;
