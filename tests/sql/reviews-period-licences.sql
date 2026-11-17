-- Synthetic data only; the final intentional subtransaction rollback removes every fixture.
DO $$
DECLARE a uuid:=gen_random_uuid(); legacy uuid:=gen_random_uuid(); b uuid; c uuid; d uuid;
 starts timestamptz:=now()-interval '10 days'; ends timestamptz:=now()+interval '20 days';
BEGIN
 BEGIN
  INSERT INTO customers(id,email,account_status) VALUES(a,a||'@example.test','active'),(legacy,legacy||'@example.test','active');
  INSERT INTO customer_marketing_access(customer_id,status,source,expires_at,location_limit)
   VALUES(a,'active','paid',ends,1),(legacy,'active','manual',ends,1);
  INSERT INTO reviews_period_licences(customer_id) VALUES(a);
  PERFORM sync_review_licence_period(a,'sub_fixture',starts,ends,1);
  b:=create_marketing_business(a,'First','QA');
  PERFORM reserve_review_period_location(a,b,'google_first');
  PERFORM reserve_review_period_location(a,b,'google_first'); -- idempotent reconnect
  BEGIN
   PERFORM reserve_review_period_location(a,b,'google_other');
   RAISE EXCEPTION USING ERRCODE='ZX002',MESSAGE='Google identity changed during paid period';
  EXCEPTION WHEN SQLSTATE 'P0001' THEN NULL; END;
  UPDATE businesses SET status='marketing_removed' WHERE id=b;
  UPDATE marketing_location_access SET enabled=false WHERE business_id=b;
  BEGIN
   PERFORM create_marketing_business(a,'Blocked replacement','QA');
   RAISE EXCEPTION USING ERRCODE='ZX002',MESSAGE='Deleted location freed its paid slot';
  EXCEPTION WHEN SQLSTATE 'P0001' THEN NULL; END;
  -- Replayed paid event must retain the removed business's reservation.
  PERFORM sync_review_licence_period(a,'sub_fixture',starts,ends,1);
  IF (SELECT count(*) FROM reviews_period_assignments WHERE customer_id=a)<>1 THEN RAISE EXCEPTION 'Reservation lost'; END IF;
  BEGIN
   PERFORM sync_review_licence_period(a,'sub_replacement',now(),ends,1);
   RAISE EXCEPTION USING ERRCODE='ZX002',MESSAGE='Resubscribe bypassed period lock';
  EXCEPTION WHEN SQLSTATE 'P0001' THEN NULL; END;
  -- A second purchased licence can still be used; removing one must not free a third.
  UPDATE customer_marketing_access SET location_limit=2 WHERE customer_id=a;
  PERFORM sync_review_licence_period(a,'sub_fixture',starts,ends,2);
  c:=create_marketing_business(a,'Second paid slot','QA');
  IF (SELECT count(*) FROM reviews_period_assignments WHERE customer_id=a)<>2 THEN RAISE EXCEPTION 'Wrong slot count'; END IF;
  BEGIN
   PERFORM create_marketing_business(a,'Third blocked','QA');
   RAISE EXCEPTION USING ERRCODE='ZX002',MESSAGE='Over-allocation';
  EXCEPTION WHEN SQLSTATE 'P0001' THEN NULL; END;
  -- Expiration alone never creates a new window, including canceled/unpaid renewals.
  UPDATE reviews_period_licences SET period_end=now()-interval '1 second' WHERE customer_id=a;
  BEGIN
   PERFORM reserve_review_period_location(a,c,'google_second');
   RAISE EXCEPTION USING ERRCODE='ZX002',MESSAGE='Expired period stayed usable';
  EXCEPTION WHEN SQLSTATE 'P0001' THEN NULL; END;
  -- A successful renewal carries the surviving location and frees the removed slot.
  PERFORM sync_review_licence_period(a,'sub_fixture',now(),now()+interval '30 days',2);
  d:=create_marketing_business(a,'Renewal replacement','QA');
  IF (SELECT count(*) FROM reviews_period_assignments WHERE customer_id=a AND period_start=now())<>2 THEN RAISE EXCEPTION 'Renewal did not carry active location'; END IF;
  BEGIN
   PERFORM create_marketing_business(a,'Renewal over limit','QA');
   RAISE EXCEPTION USING ERRCODE='ZX002',MESSAGE='Renewal carried wrong count';
  EXCEPTION WHEN SQLSTATE 'P0001' THEN NULL; END;
  -- Existing subscribers retain their previous remove-and-add behaviour.
  b:=create_marketing_business(legacy,'Existing account first','QA');
  UPDATE businesses SET status='marketing_removed' WHERE id=b;
  UPDATE marketing_location_access SET enabled=false WHERE business_id=b;
  c:=create_marketing_business(legacy,'Existing account replacement','QA');
  IF EXISTS(SELECT 1 FROM reviews_period_licences WHERE customer_id=legacy) THEN RAISE EXCEPTION 'Existing account enrolled'; END IF;
  RAISE EXCEPTION USING ERRCODE='ZX001',MESSAGE='Discard verification fixtures';
 EXCEPTION WHEN SQLSTATE 'ZX001' THEN NULL; END;
END $$;
