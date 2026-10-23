-- Internal location-count override only; AI and scan budgets remain enforced.
BEGIN;
ALTER TABLE customer_marketing_access ADD COLUMN IF NOT EXISTS unlimited_locations boolean NOT NULL DEFAULT false;
CREATE OR REPLACE FUNCTION claim_marketing_location(location_id uuid, account_id uuid) RETURNS boolean
 LANGUAGE plpgsql AS $$
DECLARE a customer_marketing_access%ROWTYPE;
BEGIN
 SELECT * INTO a FROM customer_marketing_access WHERE customer_id=account_id FOR UPDATE;
 IF NOT FOUND OR a.status NOT IN ('active','testing') OR a.expires_at<=now() THEN RETURN false; END IF;
 IF NOT EXISTS(SELECT 1 FROM businesses b JOIN customers c ON c.id=b.customer_id
 WHERE b.id=location_id AND b.customer_id=account_id AND c.account_status='active') THEN RETURN false; END IF;
 IF EXISTS(SELECT 1 FROM marketing_location_access WHERE business_id=location_id AND customer_id=account_id AND enabled) THEN RETURN true; END IF;
 IF NOT a.unlimited_locations AND (SELECT count(*) FROM marketing_location_access WHERE customer_id=account_id AND enabled)>=a.location_limit THEN RETURN false; END IF;
 INSERT INTO marketing_location_access(business_id,customer_id) VALUES(location_id,account_id)
 ON CONFLICT(business_id) DO UPDATE SET enabled=true WHERE marketing_location_access.customer_id=EXCLUDED.customer_id;
 IF NOT FOUND THEN RETURN false; END IF;
 UPDATE customer_marketing_access SET version=version+1,updated_at=now() WHERE customer_id=account_id;
 RETURN true;
END $$;
COMMIT;

