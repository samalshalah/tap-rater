BEGIN;

ALTER TABLE google_review_links ALTER COLUMN ai_consent SET DEFAULT true, ALTER COLUMN auto_enabled SET DEFAULT true, ALTER COLUMN auto_four SET DEFAULT true, ALTER COLUMN auto_five SET DEFAULT true, ALTER COLUMN draft_low_stars SET DEFAULT true, ALTER COLUMN consent_at SET DEFAULT now();

CREATE OR REPLACE FUNCTION prepare_customer_location_reconnect() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  customer_email text;
  previous_id uuid;
BEGIN
  -- Serialize competing binds to the same destination before the application's upsert.
  SELECT lower(c.email) INTO customer_email
    FROM businesses b JOIN customers c ON c.id=b.customer_id
   WHERE b.id=NEW.business_id AND c.id=NEW.customer_id AND c.account_status='active'
     AND b.status IS DISTINCT FROM 'marketing_removed'
   FOR UPDATE OF b;
  IF NOT FOUND THEN RAISE EXCEPTION 'Location unavailable'; END IF;

  -- Only the customer wizard uses this destination-specific OAuth identity.
  IF NEW.owner <> 'customer:' || customer_email || ':location:' || NEW.business_id::text
     OR EXISTS (SELECT 1 FROM google_review_links WHERE business_id=NEW.business_id)
  THEN RETURN NEW; END IF;

  SELECT l.business_id INTO previous_id
    FROM google_review_links l JOIN businesses b ON b.id=l.business_id
   WHERE split_part(l.parent,'/',4)=split_part(NEW.parent,'/',4)
     AND l.reconnected_to IS NULL AND NOT l.enabled AND b.status='marketing_removed'
     AND l.customer_id=NEW.customer_id AND b.customer_id=NEW.customer_id
   FOR UPDATE OF l,b;
  IF NOT FOUND THEN RETURN NEW; END IF;

  PERFORM 1 FROM google_business_connections WHERE owner=NEW.owner
    AND google_subject=NEW.google_subject FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Reconnect Google before selecting this location'; END IF;

  UPDATE google_review_links SET reconnected_to=NEW.business_id WHERE business_id=previous_id;
  NEW.auto_enabled := true;
  NEW.auto_four := true;
  NEW.auto_five := true;
  NEW.ai_consent := true;
  NEW.draft_low_stars := true;
  NEW.consent_at := now();
  RETURN NEW;
END
$$;

CREATE OR REPLACE FUNCTION carry_reconnected_review_history() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  -- Keep review IDs, drafts, publish results and unresolved writes. Old schedules
  -- and historical-batch requests must never resume after reconnection.
  UPDATE google_live_reviews r
     SET business_id=NEW.business_id,
         resource=NEW.parent || substr(r.resource,length(prior_link.parent)+1),
         data=CASE WHEN r.data ? 'name' THEN jsonb_set(r.data,'{name}',
              to_jsonb(NEW.parent || substr(r.resource,length(prior_link.parent)+1))) ELSE r.data END,
         scheduled_at=NULL, scheduled_version=NULL, schedule_consent_at=NULL,
         old_reply_requested_at=CASE WHEN r.publish_state='idle' THEN NULL ELSE r.old_reply_requested_at END,
         auto_schedule_cancelled=CASE WHEN r.publish_state='idle' AND r.draft='' AND r.draft_generated_at IS NULL AND r.approved_version IS NULL AND NOT r.suspected_spam THEN false ELSE r.auto_schedule_cancelled END
    FROM google_review_links prior_link
   WHERE prior_link.reconnected_to=NEW.business_id AND prior_link.customer_id=NEW.customer_id
     AND r.business_id=prior_link.business_id;
  RETURN NULL;
END
$$;

UPDATE google_review_links l SET ai_consent=true,auto_enabled=true,auto_four=true,auto_five=true,draft_low_stars=true,
 consent_at=coalesce(l.consent_at,now()),settings_version=settings_version+1,draft_due_at=now()
 FROM businesses b, customers c, google_business_connections g
 WHERE l.business_id=b.id AND l.customer_id=b.customer_id AND c.id=b.customer_id
 AND c.account_status='active' AND b.status IS DISTINCT FROM 'marketing_removed'
 AND l.enabled AND l.reconnected_to IS NULL AND marketing_location_allowed(b.id)
 AND g.owner=l.owner AND g.google_subject=l.google_subject;

UPDATE google_live_reviews r SET auto_schedule_cancelled=false,old_reply_requested_at=now()
 FROM google_review_links l, businesses b WHERE r.business_id=l.business_id AND b.id=l.business_id
 AND b.status IS DISTINCT FROM 'marketing_removed' AND l.enabled AND l.ai_consent
 AND marketing_location_allowed(b.id) AND r.publish_state='idle'
 AND r.draft='' AND r.draft_generated_at IS NULL AND r.approved_version IS NULL
 AND NOT r.suspected_spam AND coalesce(r.data->'reviewReply'->>'comment','')=''
 AND r.scheduled_at IS NULL AND r.old_reply_requested_at IS NULL
 AND r.fetched_at>now()-interval '30 days'
 AND (r.data->>'createTime')::timestamptz<=l.consent_at
 AND r.data->>'starRating' IN ('ONE','TWO','THREE','FOUR','FIVE');
COMMIT;
