BEGIN;

ALTER TABLE google_review_links ADD COLUMN reconnected_to uuid REFERENCES businesses(id);

CREATE UNIQUE INDEX google_review_current_parent ON google_review_links(parent) WHERE reconnected_to IS NULL;

CREATE UNIQUE INDEX google_review_current_location ON google_review_links(split_part(parent,'/',4)) WHERE reconnected_to IS NULL;

ALTER TABLE google_review_links DROP CONSTRAINT google_review_links_parent_key;

ALTER INDEX google_review_current_parent RENAME TO google_review_links_parent_key;

DROP INDEX google_review_links_location;

ALTER INDEX google_review_current_location RENAME TO google_review_links_location;

CREATE FUNCTION prepare_customer_location_reconnect() RETURNS trigger
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
  NEW.auto_enabled := false;
  NEW.auto_four := false;
  NEW.auto_five := false;
  NEW.ai_consent := false;
  NEW.draft_low_stars := false;
  NEW.consent_at := NULL;
  RETURN NEW;
END
$$;

CREATE TRIGGER prepare_customer_location_reconnect BEFORE INSERT ON google_review_links
FOR EACH ROW EXECUTE FUNCTION prepare_customer_location_reconnect();

CREATE FUNCTION carry_reconnected_review_history() RETURNS trigger
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
         auto_schedule_cancelled=CASE WHEN r.publish_state='idle' THEN true ELSE r.auto_schedule_cancelled END
    FROM google_review_links prior_link
   WHERE prior_link.reconnected_to=NEW.business_id AND prior_link.customer_id=NEW.customer_id
     AND r.business_id=prior_link.business_id;
  RETURN NULL;
END
$$;

CREATE TRIGGER carry_reconnected_review_history AFTER INSERT ON google_review_links
FOR EACH ROW EXECUTE FUNCTION carry_reconnected_review_history();

COMMIT;
