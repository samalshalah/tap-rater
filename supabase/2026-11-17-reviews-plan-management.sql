BEGIN;
CREATE TABLE IF NOT EXISTS reviews_billing_requests (
 customer_id uuid PRIMARY KEY REFERENCES customers(id),
 stripe_mode text NOT NULL CHECK(stripe_mode IN ('live','test')),
 subscription_id text NOT NULL, operation_id uuid NOT NULL,
 request jsonb NOT NULL, schedule_id text, completed boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS reviews_applied_plan_changes (
 subscription_id text NOT NULL, effective_at bigint NOT NULL,
 customer_id uuid NOT NULL REFERENCES customers(id), removed_ids jsonb NOT NULL,
 applied_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(subscription_id,effective_at)
);
ALTER TABLE reviews_billing_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews_applied_plan_changes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON reviews_billing_requests,reviews_applied_plan_changes FROM PUBLIC;
CREATE TABLE IF NOT EXISTS reviews_billing_completed (
 operation_id uuid PRIMARY KEY, customer_id uuid NOT NULL REFERENCES customers(id),
 request_hash text NOT NULL, completed_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE reviews_billing_completed ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON reviews_billing_completed FROM PUBLIC;

-- Called only from the verified Stripe subscription webhook after the scheduled phase begins.
-- Idempotence prevents later webhook retries from disabling a location re-added in another period.
CREATE OR REPLACE FUNCTION apply_reviews_plan_removals(account_id uuid, sub_id text, effective bigint, ids jsonb)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM reviews_period_licences WHERE customer_id=account_id) THEN RETURN; END IF;
 IF effective<=0 OR jsonb_typeof(ids)<>'array' OR jsonb_array_length(ids)>10 THEN RAISE EXCEPTION 'Invalid removal plan'; END IF;
 PERFORM 1 FROM customer_marketing_access WHERE customer_id=account_id FOR UPDATE;
 INSERT INTO reviews_applied_plan_changes(subscription_id,effective_at,customer_id,removed_ids)
 VALUES(sub_id,effective,account_id,ids) ON CONFLICT DO NOTHING;
 IF NOT FOUND THEN RETURN; END IF;
 UPDATE marketing_location_access SET enabled=false
 WHERE customer_id=account_id AND business_id IN (SELECT value::uuid FROM jsonb_array_elements_text(ids));
 UPDATE google_review_links SET enabled=false,settings_version=settings_version+1,sync_lock=NULL,sync_lock_until=NULL
 WHERE customer_id=account_id AND business_id IN (SELECT value::uuid FROM jsonb_array_elements_text(ids));
 -- Reviews, drafts, reply preferences, Google connections and stand assignments are retained.
END $$;
REVOKE ALL ON FUNCTION apply_reviews_plan_removals(uuid,text,bigint,jsonb) FROM PUBLIC;
CREATE TABLE IF NOT EXISTS reviews_management_portal_configs (
 stripe_mode text PRIMARY KEY CHECK(stripe_mode IN ('test','live')), configuration_id text NOT NULL
);
ALTER TABLE reviews_management_portal_configs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON reviews_management_portal_configs FROM PUBLIC;
-- Do not assign a licence already scheduled to leave at renewal. Existing locations keep access.
CREATE OR REPLACE FUNCTION queue_reviews_billing_request(account_id uuid, mode text, sub_id text, operation uuid, payload jsonb, paid_slots integer)
RETURNS boolean LANGUAGE plpgsql AS $$
BEGIN
 PERFORM 1 FROM customer_marketing_access WHERE customer_id=account_id FOR UPDATE;
 IF NOT FOUND THEN RETURN false; END IF;
 IF coalesce((payload->'choice'->>'unusedToRemove')::integer,0)>paid_slots-(SELECT count(*) FROM marketing_location_access WHERE customer_id=account_id AND enabled) THEN RETURN false; END IF;
 INSERT INTO reviews_billing_requests(customer_id,stripe_mode,subscription_id,operation_id,request)
 VALUES(account_id,mode,sub_id,operation,payload)
 ON CONFLICT(customer_id) DO UPDATE SET stripe_mode=EXCLUDED.stripe_mode,subscription_id=EXCLUDED.subscription_id,operation_id=EXCLUDED.operation_id,request=EXCLUDED.request,schedule_id=NULL,completed=false,created_at=now();
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION queue_reviews_billing_request(uuid,text,text,uuid,jsonb,integer) FROM PUBLIC;
CREATE OR REPLACE FUNCTION guard_reviews_scheduled_unused() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE reserved integer; paid_limit integer;
BEGIN
 IF NOT NEW.enabled OR (TG_OP='UPDATE' AND OLD.enabled) THEN RETURN NEW; END IF;
 IF NOT EXISTS(SELECT 1 FROM reviews_period_licences WHERE customer_id=NEW.customer_id) THEN RETURN NEW; END IF;
 PERFORM 1 FROM customer_marketing_access WHERE customer_id=NEW.customer_id FOR UPDATE;
 SELECT coalesce((r.request->'choice'->>'unusedToRemove')::integer,0),p.location_limit INTO reserved,paid_limit
 FROM reviews_billing_requests r JOIN reviews_period_licences p ON p.customer_id=r.customer_id
 WHERE r.customer_id=NEW.customer_id AND r.subscription_id=p.subscription_id
 AND r.request->'choice'->>'kind'='locations'
 AND (r.request->>'periodEnd')::bigint=extract(epoch FROM p.period_end)::bigint;
 IF coalesce(reserved,0)>0 AND (SELECT count(*) FROM marketing_location_access WHERE customer_id=NEW.customer_id AND enabled AND business_id<>NEW.business_id)>=paid_limit-reserved THEN
  RAISE EXCEPTION 'An unused licence is scheduled for removal. Choose Keep unused licences in Subscription & Billing before adding this location.';
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS reviews_scheduled_unused ON marketing_location_access;
CREATE TRIGGER reviews_scheduled_unused BEFORE INSERT OR UPDATE OF enabled ON marketing_location_access FOR EACH ROW EXECUTE FUNCTION guard_reviews_scheduled_unused();
REVOKE ALL ON FUNCTION guard_reviews_scheduled_unused() FROM PUBLIC;
COMMIT;
