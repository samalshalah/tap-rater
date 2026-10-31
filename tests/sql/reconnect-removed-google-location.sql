-- The intentional subtransaction rollback leaves no fixtures behind.
DO $$
DECLARE
  first_customer uuid := gen_random_uuid();
  other_customer uuid := gen_random_uuid();
  removed uuid := gen_random_uuid();
  replacement uuid := gen_random_uuid();
  other_workspace uuid := gen_random_uuid();
  place text := '/locations/' || removed;
  old_parent text := 'accounts/first' || place;
  new_parent text := 'accounts/second' || place;
  email text := first_customer || '@example.test';
  verified_owner text := 'customer:' || email || ':location:' || replacement;
  review_id uuid := gen_random_uuid();
BEGIN
  BEGIN
    INSERT INTO customers(id,email,account_status) VALUES(first_customer,email,'active'),
      (other_customer,other_customer || '@example.test','active');
    INSERT INTO customer_marketing_access(customer_id,status,source,location_limit)
      VALUES(first_customer,'active','manual',1),(other_customer,'active','manual',1);
    INSERT INTO businesses(id,customer_id,business_name) VALUES
      (removed,first_customer,'Original'),(replacement,first_customer,'New workspace'),
      (other_workspace,other_customer,'Other workspace');
    INSERT INTO google_business_connections(owner,google_subject,email,access_ciphertext,refresh_ciphertext,expires_at,scopes)
      VALUES(verified_owner,'verified',email,'fixture','fixture',now(),'fixture');
    INSERT INTO google_review_links(business_id,customer_id,owner,google_subject,parent,title,auto_enabled,ai_consent)
      VALUES(removed,first_customer,'original','original',old_parent,'Original',true,true);
    INSERT INTO google_live_reviews(id,business_id,resource,data,draft,scheduled_at)
      VALUES(review_id,removed,old_parent || '/reviews/r1',jsonb_build_object('name',old_parent || '/reviews/r1'),'Saved draft',now());
    BEGIN
      INSERT INTO google_review_links(business_id,customer_id,owner,google_subject,parent,title)
        VALUES(replacement,first_customer,verified_owner,'verified',new_parent,'Still active');
      RAISE EXCEPTION 'Active assignment was taken';
    EXCEPTION WHEN unique_violation THEN NULL; END;
    UPDATE businesses SET status='marketing_removed' WHERE id=removed;
    UPDATE google_review_links SET enabled=false,ai_consent=false,auto_enabled=false WHERE business_id=removed;
    UPDATE marketing_location_access SET enabled=false WHERE business_id=removed;
    BEGIN
      INSERT INTO google_review_links(business_id,customer_id,owner,google_subject,parent,title)
        VALUES(other_workspace,other_customer,'customer:' || other_customer || '@example.test:location:' || other_workspace,'other',new_parent,'Other');
      RAISE EXCEPTION 'Other customer took the removed assignment';
    EXCEPTION WHEN unique_violation THEN NULL; END;
    UPDATE customer_marketing_access SET location_limit=0 WHERE customer_id=first_customer;
    BEGIN
      INSERT INTO google_review_links(business_id,customer_id,owner,google_subject,parent,title)
        VALUES(replacement,first_customer,verified_owner,'verified',new_parent,'Over limit');
      RAISE EXCEPTION USING ERRCODE='ZX003', MESSAGE='Package limit bypassed';
    EXCEPTION WHEN SQLSTATE 'P0001' THEN NULL; END;
    UPDATE customer_marketing_access SET location_limit=1 WHERE customer_id=first_customer;
    INSERT INTO google_review_links(business_id,customer_id,owner,google_subject,parent,title,ai_consent)
      VALUES(replacement,first_customer,verified_owner,'verified',new_parent,'Verified',true)
      ON CONFLICT (business_id) DO NOTHING;
    IF NOT EXISTS(SELECT 1 FROM google_review_links WHERE business_id=replacement AND enabled AND NOT ai_consent
         AND NOT auto_enabled AND NOT auto_four AND NOT auto_five AND NOT draft_low_stars AND consent_at IS NULL)
      OR NOT EXISTS(SELECT 1 FROM google_review_links WHERE business_id=removed AND NOT enabled AND reconnected_to=replacement)
      OR NOT EXISTS(SELECT 1 FROM google_live_reviews WHERE id=review_id AND business_id=replacement AND draft='Saved draft'
         AND resource=new_parent || '/reviews/r1' AND data->>'name'=resource AND auto_schedule_cancelled AND scheduled_at IS NULL)
      OR NOT marketing_location_allowed(replacement)
    THEN RAISE EXCEPTION 'Reconnection verification failed'; END IF;
    RAISE EXCEPTION USING ERRCODE='ZX001',MESSAGE='Discard all verification fixtures';
  EXCEPTION WHEN SQLSTATE 'ZX001' THEN NULL; END;
END $$;
