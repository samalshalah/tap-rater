DO $$
DECLARE a uuid:=gen_random_uuid(); old_account uuid:=gen_random_uuid(); b uuid; old_b uuid;
 r uuid:=gen_random_uuid(); v integer; changed integer; access_before text; consent_before boolean;
BEGIN
 BEGIN
  INSERT INTO customers(id,email,account_status) VALUES(a,a||'@example.test','active'),(old_account,old_account||'@example.test','active');
  INSERT INTO customer_marketing_access(customer_id,status,source,expires_at,location_limit)
   VALUES(a,'active','paid',now()+interval '1 day',1),(old_account,'active','manual',now()+interval '1 day',1);
  INSERT INTO reviews_period_licences(customer_id) VALUES(a);
  PERFORM sync_review_licence_period(a,'sub_pause',now()-interval '1 day',now()+interval '1 day',1);
  b:=create_marketing_business(a,'Pause QA','QA');old_b:=create_marketing_business(old_account,'Legacy QA','QA');
  INSERT INTO google_business_connections(owner,google_subject,email,access_ciphertext,refresh_ciphertext,expires_at,scopes)
   VALUES(a::text,'qa','qa@example.test','fixture','fixture',now()+interval '1 hour','fixture');
  INSERT INTO google_review_links(business_id,customer_id,owner,google_subject,parent,title,ai_consent)
   VALUES(b,a,a::text,'qa','accounts/qa/locations/'||b,'QA',true),
    (old_b,old_account,old_account::text,'old','accounts/qa/locations/'||old_b,'Legacy',true);
  INSERT INTO google_live_reviews(id,business_id,resource,data,draft) VALUES(r,b,'accounts/qa/locations/'||b||'/reviews/one','{}','Original draft');
  SELECT settings_version,ai_consent INTO v,consent_before FROM google_review_links WHERE business_id=b;
  SELECT md5(row_to_json(x)::text) INTO access_before FROM customer_marketing_access x WHERE customer_id=a;
  SELECT count(*) INTO changed FROM set_review_service_paused(old_account||'@example.test',b,true,v);
  IF changed<>0 THEN RAISE EXCEPTION 'Foreign account paused service'; END IF;
  SELECT count(*) INTO changed FROM set_review_service_paused(a||'@example.test',b,true,v);
  IF changed<>1 THEN RAISE EXCEPTION 'Pause did not succeed'; END IF;
  IF NOT EXISTS(SELECT 1 FROM google_review_links WHERE business_id=b AND service_paused AND NOT enabled AND ai_consent=consent_before AND sync_lock IS NULL) THEN RAISE EXCEPTION 'Pause changed preferences or failed to stop work'; END IF;
  IF reserve_review_ai_hour(b) THEN RAISE EXCEPTION 'Paused service reserved drafting work'; END IF;
  UPDATE google_live_reviews SET draft='Late generated result',data='{"late":true}' WHERE id=r;
  IF NOT EXISTS(SELECT 1 FROM google_live_reviews WHERE id=r AND draft='Original draft' AND data='{}') THEN RAISE EXCEPTION 'Late result bypassed pause'; END IF;
  INSERT INTO google_live_reviews(business_id,resource,data) VALUES(b,'accounts/qa/locations/'||b||'/reviews/late','{}');
  IF (SELECT count(*) FROM google_live_reviews WHERE business_id=b)<>1 THEN RAISE EXCEPTION 'Import bypassed pause'; END IF;
  UPDATE google_review_links SET enabled=true WHERE business_id=b;
  IF EXISTS(SELECT 1 FROM google_review_links WHERE business_id=b AND enabled) THEN RAISE EXCEPTION 'Reconnect bypassed pause'; END IF;
  SELECT count(*) INTO changed FROM set_review_service_paused(a||'@example.test',b,false,v);
  IF changed<>0 THEN RAISE EXCEPTION 'Stale request resumed service'; END IF;
  SELECT settings_version INTO v FROM google_review_links WHERE business_id=b;
  SELECT count(*) INTO changed FROM set_review_service_paused(a||'@example.test',b,false,v);
  IF changed<>1 OR NOT EXISTS(SELECT 1 FROM google_review_links WHERE business_id=b AND enabled AND NOT service_paused AND ai_consent=consent_before) THEN RAISE EXCEPTION 'Resume failed or changed preferences'; END IF;
  UPDATE google_live_reviews SET draft='New draft after resume' WHERE id=r;
  IF NOT EXISTS(SELECT 1 FROM google_live_reviews WHERE id=r AND draft='New draft after resume') THEN RAISE EXCEPTION 'Resumed drafts blocked'; END IF;
  IF (SELECT md5(row_to_json(x)::text) FROM customer_marketing_access x WHERE customer_id=a)<>access_before
    OR (SELECT count(*) FROM reviews_period_assignments WHERE customer_id=a)<>1
    OR NOT EXISTS(SELECT 1 FROM marketing_location_access WHERE business_id=b AND enabled)
    OR EXISTS(SELECT 1 FROM marketing_usage_reservations WHERE customer_id=a) THEN RAISE EXCEPTION 'Billing, licence or allowance changed'; END IF;
  SELECT settings_version INTO v FROM google_review_links WHERE business_id=old_b;
  SELECT count(*) INTO changed FROM set_review_service_paused(old_account||'@example.test',old_b,true,v);
  IF changed<>0 OR NOT EXISTS(SELECT 1 FROM google_review_links WHERE business_id=old_b AND enabled AND NOT service_paused) THEN RAISE EXCEPTION 'Existing subscriber changed'; END IF;
  -- Explicitly opted-in existing accounts get controls without a licence policy.
  INSERT INTO reviews_service_pause_accounts(customer_id) VALUES(old_account);
  INSERT INTO google_business_connections(owner,google_subject,email,access_ciphertext,refresh_ciphertext,expires_at,scopes)
   VALUES(old_account::text,'old','legacy@example.test','fixture','fixture',now()+interval '1 hour','fixture');
  UPDATE google_review_links SET auto_enabled=true,auto_four=true,auto_five=true WHERE business_id=old_b;
  SELECT settings_version INTO v FROM google_review_links WHERE business_id=old_b;
  SELECT count(*) INTO changed FROM set_review_service_paused(old_account||'@example.test',old_b,true,v);
  IF changed<>1 THEN RAISE EXCEPTION 'Opted-in legacy pause failed'; END IF;
  INSERT INTO google_live_reviews(business_id,resource,data) VALUES(old_b,'accounts/qa/locations/'||old_b||'/reviews/late','{}');
  IF EXISTS(SELECT 1 FROM google_live_reviews WHERE business_id=old_b) THEN RAISE EXCEPTION 'Opt-in late import bypassed pause'; END IF;
  SELECT settings_version INTO v FROM google_review_links WHERE business_id=old_b;
  SELECT count(*) INTO changed FROM set_review_service_paused(old_account||'@example.test',old_b,false,v);
  IF changed<>1 OR NOT EXISTS(SELECT 1 FROM google_review_links WHERE business_id=old_b AND enabled AND NOT service_paused AND auto_enabled AND auto_four AND auto_five AND ai_consent) THEN RAISE EXCEPTION 'Opt-in resume changed reply preferences'; END IF;
  IF EXISTS(SELECT 1 FROM reviews_period_licences WHERE customer_id=old_account) OR EXISTS(SELECT 1 FROM reviews_period_assignments WHERE customer_id=old_account) THEN RAISE EXCEPTION 'Opt-in changed licence policy'; END IF;
  RAISE EXCEPTION USING ERRCODE='ZX001' ,MESSAGE='Discard all fixtures';
 EXCEPTION WHEN SQLSTATE 'ZX001' THEN NULL; END;
END $$;
