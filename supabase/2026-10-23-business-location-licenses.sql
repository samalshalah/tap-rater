CREATE OR REPLACE FUNCTION create_marketing_business(account_id uuid, business_title text, business_address text, business_phone text DEFAULT '', business_website text DEFAULT '') RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE a customer_marketing_access%ROWTYPE; location_id uuid;
BEGIN
 SELECT * INTO a FROM customer_marketing_access WHERE customer_id=account_id FOR UPDATE;
 IF NOT FOUND OR a.status NOT IN ('active','testing') OR a.expires_at<=now() OR NOT EXISTS(SELECT 1 FROM customers WHERE id=account_id AND account_status='active') THEN RAISE EXCEPTION 'Purchase a location license before adding a business.'; END IF;
 IF NOT a.unlimited_locations AND (SELECT count(*) FROM marketing_location_access WHERE customer_id=account_id AND enabled)>=a.location_limit THEN RAISE EXCEPTION 'Purchase an additional location license before adding another business.'; END IF;
 INSERT INTO businesses(customer_id,business_name,address,phone,website_url,status) VALUES(account_id,business_title,business_address,business_phone,business_website,'active') RETURNING id INTO location_id;
 IF NOT claim_marketing_location(location_id,account_id) THEN RAISE EXCEPTION 'A location license is required.'; END IF;
 RETURN location_id;
END $$;
