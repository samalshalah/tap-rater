-- New subscriber policy. Existing customers and their saved settings are untouched.
CREATE TABLE IF NOT EXISTS reviews_draft_only_customers (
 customer_id uuid PRIMARY KEY REFERENCES customers(id) ON DELETE CASCADE,
 created_at timestamptz NOT NULL DEFAULT now()
);
