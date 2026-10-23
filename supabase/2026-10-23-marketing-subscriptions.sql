BEGIN;
CREATE TABLE IF NOT EXISTS marketing_subscriptions (
 customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
 stripe_mode text NOT NULL CHECK(stripe_mode IN ('test','live')),
 stripe_subscription_id text UNIQUE,
 stripe_customer_id text,
 checkout_session_id text,
 attempt text NOT NULL,
 request_fingerprint text NOT NULL DEFAULT '',
 cadence text NOT NULL CHECK(cadence = 'month'),
 locations integer NOT NULL CHECK(locations BETWEEN 1 AND 10),
 status text NOT NULL DEFAULT 'checkout',
 checkout_expires_at timestamptz NOT NULL,
 current_period_end timestamptz,
 cancel_at_period_end boolean NOT NULL DEFAULT false,
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(customer_id,stripe_mode)
);
ALTER TABLE marketing_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_subscriptions DROP CONSTRAINT IF EXISTS marketing_subscriptions_cadence_check;
ALTER TABLE marketing_subscriptions ADD CONSTRAINT marketing_subscriptions_cadence_check CHECK(cadence = 'month');
ALTER TABLE marketing_subscriptions ADD COLUMN IF NOT EXISTS request_fingerprint text NOT NULL DEFAULT '';
CREATE OR REPLACE FUNCTION enforce_paid_keyword_limit() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE paid boolean;
BEGIN
 SELECT source='paid' INTO paid FROM customer_marketing_access WHERE customer_id=NEW.customer_id FOR UPDATE;
 IF paid AND NEW.active AND NEW.slot>3 THEN RAISE EXCEPTION 'Growth includes three keyword slots. Edit one of your first three keywords.' USING ERRCODE='P0001'; END IF;
 RETURN NEW;
END $$;
CREATE OR REPLACE TRIGGER paid_keyword_limit BEFORE INSERT OR UPDATE ON local_heatmap_tracks FOR EACH ROW EXECUTE FUNCTION enforce_paid_keyword_limit();
REVOKE ALL ON FUNCTION enforce_paid_keyword_limit() FROM PUBLIC;
COMMIT;
