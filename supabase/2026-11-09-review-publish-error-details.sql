ALTER TABLE google_live_reviews
  ADD COLUMN IF NOT EXISTS last_publish_error text;
