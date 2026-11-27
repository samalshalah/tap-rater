-- Additive migration. Invitations are private; publication requires explicit consent.
CREATE TABLE IF NOT EXISTS product_review_invitations (
  id uuid PRIMARY KEY,
  product_slug text NOT NULL DEFAULT 'google-review-stand' CHECK (product_slug = 'google-review-stand'),
  customer_name text NOT NULL CHECK (length(customer_name) BETWEEN 1 AND 100),
  email text NOT NULL UNIQUE CHECK (email = lower(email) AND length(email) <= 254),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT date_trunc('milliseconds', now() + interval '90 days'),
  email_status text NOT NULL DEFAULT 'sending' CHECK (email_status IN ('sending','sent','failed')),
  send_sequence integer NOT NULL DEFAULT 1,
  last_attempt_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  rating smallint CHECK (rating BETWEEN 1 AND 5),
  display_name text CHECK (length(display_name) BETWEEN 1 AND 100),
  business_name text CHECK (length(business_name) <= 120),
  review_body text CHECK (length(review_body) BETWEEN 10 AND 2000),
  photo_key text,
  publish_permission boolean NOT NULL DEFAULT false,
  photo_permission boolean NOT NULL DEFAULT false,
  submitted_at timestamptz,
  moderation_status text NOT NULL DEFAULT 'pending' CHECK (moderation_status IN ('pending','published','private')),
  moderated_at timestamptz,
  CHECK ((rating IS NULL AND submitted_at IS NULL) OR (rating IS NOT NULL AND submitted_at IS NOT NULL AND display_name IS NOT NULL AND review_body IS NOT NULL)),
  CHECK (moderation_status <> 'published' OR (publish_permission AND rating IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS product_review_submissions_idx ON product_review_invitations (submitted_at DESC) WHERE rating IS NOT NULL;
CREATE INDEX IF NOT EXISTS product_review_public_idx ON product_review_invitations (product_slug, submitted_at DESC) WHERE moderation_status = 'published' AND publish_permission;
ALTER TABLE product_review_invitations ENABLE ROW LEVEL SECURITY;
-- The server uses the database owner. No public/anonymous Data API access is granted.
