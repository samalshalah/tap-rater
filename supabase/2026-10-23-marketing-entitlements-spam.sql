-- Apply before the accompanying application release. No billing is activated.
BEGIN;
ALTER TABLE customer_marketing_access
 ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1,
 ADD COLUMN IF NOT EXISTS location_limit integer NOT NULL DEFAULT 1 CHECK(location_limit BETWEEN 0 AND 1000),
 ADD COLUMN IF NOT EXISTS ai_monthly_limit integer NOT NULL DEFAULT 100 CHECK(ai_monthly_limit BETWEEN 0 AND 100000),
 ADD COLUMN IF NOT EXISTS heatmap_monthly_points integer NOT NULL DEFAULT 300 CHECK(heatmap_monthly_points BETWEEN 0 AND 1000000);

CREATE TABLE IF NOT EXISTS marketing_location_access (
 business_id uuid PRIMARY KEY REFERENCES businesses(id) ON DELETE CASCADE,
 customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
 enabled boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO marketing_location_access(business_id,customer_id)
 SELECT l.business_id,l.customer_id FROM google_review_links l
 JOIN customer_marketing_access a ON a.customer_id=l.customer_id
 ON CONFLICT DO NOTHING;
-- Preserve existing locations; never silently remove access during migration.
UPDATE customer_marketing_access a SET location_limit=GREATEST(a.location_limit,
 (SELECT count(*) FROM marketing_location_access l WHERE l.customer_id=a.customer_id AND l.enabled));

CREATE TABLE IF NOT EXISTS marketing_usage_reservations (
 business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
 customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
 month date NOT NULL,
 service text NOT NULL CHECK(service IN ('ai','heatmap')),
 request_key text NOT NULL,
 units integer NOT NULL CHECK(units>0),
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(business_id,service,request_key)
);
CREATE INDEX IF NOT EXISTS marketing_usage_month ON marketing_usage_reservations(business_id,month,service);
CREATE TABLE IF NOT EXISTS marketing_access_audit (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
 settings jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE marketing_location_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_usage_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_access_audit ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION marketing_location_allowed(location_id uuid) RETURNS boolean
 LANGUAGE sql STABLE AS $$
 SELECT EXISTS(SELECT 1 FROM marketing_location_access l
 JOIN businesses b ON b.id=l.business_id AND b.customer_id=l.customer_id
 JOIN customers c ON c.id=b.customer_id AND c.account_status='active'
 JOIN customer_marketing_access a ON a.customer_id=c.id
 WHERE l.business_id=location_id AND l.enabled AND a.status IN ('active','testing')
 AND (a.expires_at IS NULL OR a.expires_at>now()));
$$;

-- Serialize assignments on the account row so concurrent connects cannot exceed the limit.
CREATE OR REPLACE FUNCTION claim_marketing_location(location_id uuid, account_id uuid) RETURNS boolean
 LANGUAGE plpgsql AS $$
DECLARE a customer_marketing_access%ROWTYPE;
BEGIN
 SELECT * INTO a FROM customer_marketing_access WHERE customer_id=account_id FOR UPDATE;
 IF NOT FOUND OR a.status NOT IN ('active','testing') OR a.expires_at<=now() THEN RETURN false; END IF;
 IF NOT EXISTS(SELECT 1 FROM businesses b JOIN customers c ON c.id=b.customer_id
 WHERE b.id=location_id AND b.customer_id=account_id AND c.account_status='active') THEN RETURN false; END IF;
 IF EXISTS(SELECT 1 FROM marketing_location_access WHERE business_id=location_id AND customer_id=account_id AND enabled) THEN RETURN true; END IF;
 IF (SELECT count(*) FROM marketing_location_access WHERE customer_id=account_id AND enabled)>=a.location_limit THEN RETURN false; END IF;
 INSERT INTO marketing_location_access(business_id,customer_id) VALUES(location_id,account_id)
 ON CONFLICT(business_id) DO UPDATE SET enabled=true WHERE marketing_location_access.customer_id=EXCLUDED.customer_id;
 IF NOT FOUND THEN RETURN false; END IF;
 UPDATE customer_marketing_access SET version=version+1,updated_at=now() WHERE customer_id=account_id;
 RETURN true;
END $$;

-- Reservations count attempts, including failures/unknown outcomes, to avoid retry overspend.
-- Review and profile AI share the same per-location monthly allowance.
CREATE OR REPLACE FUNCTION reserve_marketing_units(location_id uuid, service_name text, amount integer, key text) RETURNS boolean
 LANGUAGE plpgsql AS $$
DECLARE a customer_marketing_access%ROWTYPE; used bigint; cap integer;
 month_key date:=date_trunc('month',now() AT TIME ZONE 'America/New_York')::date;
BEGIN
 IF amount<=0 OR service_name NOT IN ('ai','heatmap') OR key IS NULL OR length(key)>200 THEN RETURN false; END IF;
 SELECT ma.* INTO a FROM customer_marketing_access ma JOIN businesses b ON b.customer_id=ma.customer_id
 WHERE b.id=location_id FOR UPDATE OF ma;
 IF NOT FOUND OR NOT marketing_location_allowed(location_id) THEN RETURN false; END IF;
 IF EXISTS(SELECT 1 FROM marketing_usage_reservations WHERE business_id=location_id AND service=service_name AND request_key=key AND units=amount AND month=month_key) THEN RETURN true; END IF;
 cap:=CASE WHEN service_name='ai' THEN a.ai_monthly_limit ELSE a.heatmap_monthly_points END;
 SELECT coalesce(sum(units),0) INTO used FROM marketing_usage_reservations WHERE business_id=location_id AND service=service_name AND month=month_key;
 IF used+amount>cap THEN RETURN false; END IF;
 IF service_name='ai' AND a.source='paid' THEN
  SELECT coalesce(sum(units),0) INTO used FROM marketing_usage_reservations WHERE business_id=location_id AND service='ai' AND month=month_key AND (request_key LIKE 'profile:%')=(key LIKE 'profile:%');
  IF used+amount>(CASE WHEN key LIKE 'profile:%' THEN 10 ELSE 300 END) THEN RETURN false; END IF;
 END IF;
 INSERT INTO marketing_usage_reservations(business_id,customer_id,month,service,request_key,units)
 VALUES(location_id,a.customer_id,month_key,service_name,key,amount) ON CONFLICT DO NOTHING;
 RETURN FOUND;
END $$;
REVOKE ALL ON FUNCTION marketing_location_allowed(uuid),claim_marketing_location(uuid,uuid),reserve_marketing_units(uuid,text,integer,text) FROM PUBLIC;

-- This release must not start paid ranking work, including pre-existing schedules.
UPDATE local_rank_provider SET enabled=false,updated_at=now() WHERE id=true;

ALTER TABLE google_live_reviews ADD COLUMN IF NOT EXISTS suspected_spam boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION enforce_marketing_location_slot() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NOT claim_marketing_location(NEW.business_id,NEW.customer_id) THEN
  RAISE EXCEPTION 'Marketing location allowance unavailable' USING ERRCODE='P0001';
 END IF;
 RETURN NEW;
END $$;
CREATE OR REPLACE TRIGGER marketing_location_slot AFTER INSERT ON google_review_links
 FOR EACH ROW EXECUTE FUNCTION enforce_marketing_location_slot();
REVOKE ALL ON FUNCTION enforce_marketing_location_slot() FROM PUBLIC;

CREATE OR REPLACE FUNCTION claim_local_rank_points() RETURNS SETOF local_rank_points LANGUAGE plpgsql AS $$
DECLARE cfg local_rank_provider%ROWTYPE; spent bigint; allowance integer; candidate record; claimed local_rank_points%ROWTYPE;
 month_key date:=date_trunc('month',now() AT TIME ZONE 'America/New_York')::date;
BEGIN
 SELECT * INTO cfg FROM local_rank_provider WHERE id=true FOR UPDATE;
 IF NOT FOUND OR NOT cfg.enabled OR cfg.halt_reason IS NOT NULL OR cfg.monthly_cap_microusd=0 THEN RETURN; END IF;
 INSERT INTO local_rank_budgets(month) VALUES(month_key) ON CONFLICT DO NOTHING;
 SELECT reserved_microusd INTO spent FROM local_rank_budgets WHERE month=month_key;
 allowance:=LEAST(100,GREATEST(0,(cfg.monthly_cap_microusd-spent)/600));
 IF allowance=0 THEN RETURN; END IF;
 FOR candidate IN
  SELECT p.id,r.business_id FROM local_rank_points p JOIN local_rank_runs r ON r.id=p.run_id
  JOIN local_rank_schedules s ON s.business_id=r.business_id AND s.customer_id=r.customer_id AND s.parent=r.parent AND s.google_subject=r.google_subject AND s.enabled
  JOIN google_review_links l ON l.business_id=r.business_id AND l.customer_id=r.customer_id AND l.parent=r.parent AND l.google_subject=r.google_subject AND l.enabled
  JOIN google_business_connections g ON g.owner=l.owner AND g.google_subject=l.google_subject
  JOIN local_heatmap_tracks t ON t.id=p.track_id AND t.business_id=r.business_id AND t.customer_id=r.customer_id AND t.parent=r.parent AND t.google_subject=r.google_subject AND t.active
  WHERE p.state='queued' AND r.period>=month_key AND marketing_location_allowed(r.business_id)
  AND EXISTS(SELECT 1 FROM customer_marketing_access a WHERE a.customer_id=r.customer_id AND a.heatmap_monthly_points>coalesce((SELECT sum(u.units) FROM marketing_usage_reservations u WHERE u.business_id=r.business_id AND u.service='heatmap' AND u.month=month_key),0))
  ORDER BY r.created_at,p.track_id,p.point_index LIMIT 100 FOR UPDATE OF p SKIP LOCKED
 LOOP
  IF reserve_marketing_units(candidate.business_id,'heatmap',1,candidate.id::text) THEN
   UPDATE local_rank_points SET state='submitting',reserved_microusd=600,budget_month=month_key,submitted_at=now()
    WHERE id=candidate.id RETURNING * INTO claimed;
   UPDATE local_rank_budgets SET reserved_microusd=reserved_microusd+600 WHERE month=month_key;
   RETURN NEXT claimed;
   allowance:=allowance-1;
   IF allowance=0 THEN EXIT; END IF;
  END IF;
 END LOOP;
END $$;
REVOKE ALL ON FUNCTION claim_local_rank_points() FROM PUBLIC;
COMMIT;
