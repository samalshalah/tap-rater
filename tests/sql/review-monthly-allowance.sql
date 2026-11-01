DO $$
DECLARE c uuid:=gen_random_uuid(); b uuid:=gen_random_uuid(); b2 uuid:=gen_random_uuid();
BEGIN
 BEGIN
  INSERT INTO customers(id,email,account_status) VALUES(c,c||'@example.test','active');
  INSERT INTO customer_marketing_access(customer_id,status,source,location_limit)
    VALUES(c,'active','paid',2);
  IF (SELECT ai_monthly_limit FROM customer_marketing_access WHERE customer_id=c) <> 1000 THEN
    RAISE EXCEPTION 'Wrong new-account allowance'; END IF;
  INSERT INTO businesses(id,customer_id,business_name) VALUES(b,c,'Allowance test'),(b2,c,'Second location');
  PERFORM claim_marketing_location(b,c); PERFORM claim_marketing_location(b2,c);
  IF NOT reserve_marketing_units(b,'ai',999,'first') THEN RAISE EXCEPTION 'Paid legacy cap blocks allowance'; END IF;
  IF NOT reserve_marketing_units(b,'ai',1,'last') THEN RAISE EXCEPTION '1000th generation blocked'; END IF;
  IF NOT reserve_marketing_units(b,'ai',1,'last') THEN RAISE EXCEPTION 'Retry not idempotent'; END IF;
  IF reserve_marketing_units(b,'ai',1,'extra') THEN RAISE EXCEPTION 'Limit exceeded'; END IF;
  IF NOT reserve_marketing_units(b2,'ai',1000,'second') THEN RAISE EXCEPTION 'Locations share allowance'; END IF;
  RAISE EXCEPTION USING ERRCODE='ZX001',MESSAGE='Rollback fixtures';
 EXCEPTION WHEN SQLSTATE 'ZX001' THEN NULL;
 END;
END $$;
