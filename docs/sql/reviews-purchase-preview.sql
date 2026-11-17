-- Anonymous, browser-bound read-only previews. No customer/business is created before checkout.
CREATE TABLE IF NOT EXISTS reviews_purchase_previews (
 id uuid PRIMARY KEY,
 secret_hash text NOT NULL,
 selection jsonb NOT NULL,
 google_account text,
 google_location text,
 verified_name text,
 verified_address text,
 analysis jsonb,
 complete boolean NOT NULL DEFAULT false,
 next_page text,
 version integer NOT NULL DEFAULT 1,
 api_after timestamptz NOT NULL DEFAULT now(),
 api_calls integer NOT NULL DEFAULT 0,
 customer_id uuid REFERENCES customers(id),
 purchase_attempt uuid,
 stripe_mode text CHECK (stripe_mode IN ('live','test')),
 paid_at timestamptz,
 business_id uuid REFERENCES businesses(id),
 expires_at timestamptz NOT NULL DEFAULT now()+interval '1 day',
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS reviews_purchase_previews_customer ON reviews_purchase_previews(customer_id) WHERE paid_at IS NOT NULL;
ALTER TABLE reviews_purchase_previews ENABLE ROW LEVEL SECURITY;
