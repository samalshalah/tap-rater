BEGIN;
-- Explicit opt-in for NEW checkout customers only. No existing accounts are backfilled.
CREATE TABLE IF NOT EXISTS reviews_period_licences (
 customer_id uuid PRIMARY KEY REFERENCES customers(id) ON DELETE CASCADE,
 subscription_id text, period_start timestamptz, period_end timestamptz,
 location_limit integer NOT NULL DEFAULT 0 CHECK(location_limit>=0),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS reviews_period_assignments (
 customer_id uuid NOT NULL REFERENCES reviews_period_licences(customer_id) ON DELETE CASCADE,
 subscription_id text NOT NULL, period_start timestamptz NOT NULL,
 business_id uuid NOT NULL, google_location text,
 PRIMARY KEY(customer_id,subscription_id,period_start,business_id)
);
-- business_id intentionally has no cascading FK: removing a business cannot erase its reservation.
CREATE TABLE IF NOT EXISTS reviews_period_portal_configs (
 stripe_mode text PRIMARY KEY CHECK(stripe_mode IN ('test','live')), configuration_id text NOT NULL
);
ALTER TABLE reviews_period_licences ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews_period_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews_period_portal_configs ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION reserve_review_period_location(account_id uuid, location_id uuid, google_id text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE p reviews_period_licences%ROWTYPE; existing_google text;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM reviews_period_licences WHERE customer_id=account_id) THEN RETURN; END IF;
 -- Use the same lock order as claim_marketing_location and subscription renewal.
 PERFORM 1 FROM customer_marketing_access WHERE customer_id=account_id FOR UPDATE;
 SELECT * INTO p FROM reviews_period_licences WHERE customer_id=account_id FOR UPDATE;
 IF p.period_start IS NULL OR p.period_start>now() OR p.period_end<=now() OR NOT EXISTS(
  SELECT 1 FROM customer_marketing_access WHERE customer_id=account_id AND status='active' AND expires_at>now()
 ) THEN RAISE EXCEPTION 'A paid renewal is required before using a location licence.'; END IF;
 SELECT google_location INTO existing_google FROM reviews_period_assignments
 WHERE customer_id=account_id AND subscription_id=p.subscription_id AND period_start=p.period_start AND business_id=location_id;
 IF FOUND THEN
  IF google_id IS NOT NULL AND existing_google IS NOT NULL AND existing_google<>google_id THEN
   RAISE EXCEPTION 'This licence is reserved for its Google location until renewal.';
  END IF;
 ELSE
  IF (SELECT count(*) FROM reviews_period_assignments WHERE customer_id=account_id AND subscription_id=p.subscription_id AND period_start=p.period_start)>=p.location_limit THEN
   RAISE EXCEPTION 'All licences are reserved until renewal. Removing a location does not release its licence during the paid period.';
  END IF;
  INSERT INTO reviews_period_assignments(customer_id,subscription_id,period_start,business_id)
  VALUES(account_id,p.subscription_id,p.period_start,location_id);
 END IF;
 IF google_id IS NOT NULL THEN
  UPDATE reviews_period_assignments SET google_location=google_id WHERE customer_id=account_id
   AND subscription_id=p.subscription_id AND period_start=p.period_start AND business_id=location_id AND google_location IS NULL;
 END IF;
END $$;

CREATE OR REPLACE FUNCTION enforce_review_period_access() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.enabled THEN PERFORM reserve_review_period_location(NEW.customer_id,NEW.business_id); END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS review_period_access ON marketing_location_access;
CREATE TRIGGER review_period_access BEFORE INSERT OR UPDATE ON marketing_location_access FOR EACH ROW EXECUTE FUNCTION enforce_review_period_access();

CREATE OR REPLACE FUNCTION enforce_review_period_google_location() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.enabled THEN PERFORM reserve_review_period_location(NEW.customer_id,NEW.business_id,split_part(NEW.parent,'/',4)); END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS review_period_google_location ON google_review_links;
CREATE TRIGGER review_period_google_location BEFORE INSERT OR UPDATE OF parent,enabled ON google_review_links FOR EACH ROW EXECUTE FUNCTION enforce_review_period_google_location();

-- Only called for a currently verified, paid Stripe subscription. Mere passage of time never renews a licence.
CREATE OR REPLACE FUNCTION sync_review_licence_period(account_id uuid, sub_id text, starts timestamptz, ends timestamptz, slots integer)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE p reviews_period_licences%ROWTYPE;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM reviews_period_licences WHERE customer_id=account_id) THEN RETURN; END IF;
 PERFORM 1 FROM customer_marketing_access WHERE customer_id=account_id FOR UPDATE;
 SELECT * INTO p FROM reviews_period_licences WHERE customer_id=account_id FOR UPDATE;
 IF starts IS NULL OR ends IS NULL OR starts>=ends OR slots<1 OR slots>10 THEN RAISE EXCEPTION 'Invalid paid licence period.'; END IF;
 IF p.period_start IS NOT NULL AND starts<p.period_start THEN RAISE EXCEPTION 'Stale paid licence period.'; END IF;
 IF p.period_start IS NOT NULL AND (starts<>p.period_start OR sub_id<>p.subscription_id) AND starts<p.period_end THEN
  RAISE EXCEPTION 'A new subscription cannot release the current paid-period reservations.';
 END IF;
 UPDATE reviews_period_licences SET subscription_id=sub_id,period_start=starts,
  period_end=CASE WHEN p.period_start=starts AND p.subscription_id=sub_id THEN greatest(p.period_end,ends) ELSE ends END,
  location_limit=slots WHERE customer_id=account_id;
 -- Carry surviving active locations into the renewed period. Removed locations keep only their old reservation.
 INSERT INTO reviews_period_assignments(customer_id,subscription_id,period_start,business_id,google_location)
 SELECT account_id,sub_id,starts,m.business_id,split_part(l.parent,'/',4)
 FROM marketing_location_access m JOIN businesses b ON b.id=m.business_id
 LEFT JOIN google_review_links l ON l.business_id=b.id AND l.customer_id=account_id
 WHERE m.customer_id=account_id AND m.enabled AND b.status IS DISTINCT FROM 'marketing_removed'
 ORDER BY m.created_at,m.business_id LIMIT slots
 ON CONFLICT DO NOTHING;
END $$;
REVOKE ALL ON FUNCTION reserve_review_period_location(uuid,uuid,text),enforce_review_period_access(),enforce_review_period_google_location(),sync_review_licence_period(uuid,text,timestamptz,timestamptz,integer) FROM PUBLIC;
COMMIT;
