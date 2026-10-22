CREATE TABLE IF NOT EXISTS customer_marketing_access (
 customer_id uuid PRIMARY KEY REFERENCES customers(id) ON DELETE CASCADE,
 status text NOT NULL CHECK(status IN ('active','testing','inactive')),
 source text NOT NULL CHECK(source IN ('paid','manual','testing')),
 expires_at timestamptz,
 updated_at timestamptz NOT NULL DEFAULT now()
);
-- Explicitly retain the authorized Norah testing account; stand purchases grant no access.
INSERT INTO customer_marketing_access(customer_id,status,source)
 SELECT id,'testing','testing' FROM customers WHERE id='9fc0deba-bb6d-4c2c-8279-a4b852212523'
 ON CONFLICT(customer_id) DO NOTHING;
CREATE TABLE IF NOT EXISTS customer_marketing_requests (
 customer_id uuid PRIMARY KEY REFERENCES customers(id) ON DELETE CASCADE,
 requested_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE customer_marketing_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_marketing_requests ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION claim_local_rank_points() RETURNS SETOF local_rank_points
LANGUAGE plpgsql AS $$
DECLARE cfg local_rank_provider%ROWTYPE; spent bigint; allowance integer;
 month_key date := date_trunc('month',now() AT TIME ZONE 'America/New_York')::date;
BEGIN
 SELECT * INTO cfg FROM local_rank_provider WHERE id=true FOR UPDATE;
 IF NOT cfg.enabled OR cfg.halt_reason IS NOT NULL OR cfg.monthly_cap_microusd=0 THEN RETURN; END IF;
 INSERT INTO local_rank_budgets(month) VALUES(month_key) ON CONFLICT DO NOTHING;
 SELECT reserved_microusd INTO spent FROM local_rank_budgets WHERE month=month_key;
 allowance := LEAST(100,GREATEST(0,(cfg.monthly_cap_microusd-spent)/600));
 IF allowance=0 THEN RETURN; END IF;
 RETURN QUERY WITH eligible AS (
  SELECT p.id FROM local_rank_points p JOIN local_rank_runs r ON r.id=p.run_id
  JOIN local_rank_schedules s ON s.business_id=r.business_id AND s.customer_id=r.customer_id AND s.parent=r.parent AND s.google_subject=r.google_subject AND s.enabled
  JOIN businesses b ON b.id=r.business_id AND b.customer_id=r.customer_id
  JOIN customers c ON c.id=b.customer_id AND c.account_status='active'
  JOIN google_review_links l ON l.business_id=r.business_id AND l.customer_id=r.customer_id AND l.parent=r.parent AND l.google_subject=r.google_subject AND l.enabled
  JOIN google_business_connections g ON g.owner=l.owner AND g.google_subject=l.google_subject
  JOIN local_heatmap_tracks t ON t.id=p.track_id AND t.business_id=r.business_id AND t.customer_id=r.customer_id AND t.parent=r.parent AND t.google_subject=r.google_subject AND t.active
  WHERE EXISTS(SELECT 1 FROM customer_marketing_access ma WHERE ma.customer_id=c.id AND ma.status IN ('active','testing') AND (ma.expires_at IS NULL OR ma.expires_at>now())) AND p.state='queued' AND r.period>=month_key
  ORDER BY r.created_at,p.track_id,p.point_index LIMIT allowance FOR UPDATE OF p SKIP LOCKED
 ), claimed AS (
  UPDATE local_rank_points p SET state='submitting',reserved_microusd=600,budget_month=month_key,submitted_at=now()
  FROM eligible e WHERE p.id=e.id RETURNING p.*
 ), budget AS (
  UPDATE local_rank_budgets SET reserved_microusd=reserved_microusd+(SELECT count(*)*600 FROM claimed) WHERE month=month_key
 ) SELECT * FROM claimed;
END $$;
REVOKE ALL ON FUNCTION claim_local_rank_points() FROM PUBLIC;
