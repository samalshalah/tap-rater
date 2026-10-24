-- Fail closed: activation and a nonzero cap are explicit administrative steps.
CREATE TABLE IF NOT EXISTS local_rank_provider (
 id boolean PRIMARY KEY DEFAULT true CHECK (id), enabled boolean NOT NULL DEFAULT false,
 monthly_cap_microusd bigint NOT NULL DEFAULT 0 CHECK (monthly_cap_microusd BETWEEN 0 AND 1000000000),
 halt_reason text, updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO local_rank_provider(id) VALUES(true) ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS local_rank_schedules (
 business_id uuid PRIMARY KEY REFERENCES local_heatmap_locations(business_id) ON DELETE CASCADE,
 customer_id uuid NOT NULL REFERENCES customers(id), parent text NOT NULL, google_subject text NOT NULL,
 enabled boolean NOT NULL DEFAULT false, cadence text NOT NULL DEFAULT 'weekly' CHECK (cadence IN ('weekly','four_monthly')), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS local_rank_runs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), business_id uuid NOT NULL REFERENCES local_heatmap_locations(business_id) ON DELETE CASCADE,
 customer_id uuid NOT NULL REFERENCES customers(id), parent text NOT NULL, google_subject text NOT NULL,
 period date NOT NULL, anchor jsonb NOT NULL, tracks jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(business_id,period)
);
CREATE TABLE IF NOT EXISTS local_rank_points (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), run_id uuid NOT NULL REFERENCES local_rank_runs(id) ON DELETE CASCADE,
 track_id uuid NOT NULL, point_index smallint NOT NULL CHECK(point_index BETWEEN 0 AND 48),
 request jsonb NOT NULL, state text NOT NULL DEFAULT 'queued' CHECK(state IN ('queued','submitting','pending','complete','error','uncertain')),
 provider_id text, rank smallint CHECK(rank BETWEEN 1 AND 100), result_count integer,
 reserved_microusd integer NOT NULL DEFAULT 0, budget_month date, actual_microusd integer,
 checked_at timestamptz, submitted_at timestamptz, error_code text,
 UNIQUE(run_id,track_id,point_index)
);
CREATE TABLE IF NOT EXISTS local_rank_budgets (
 month date PRIMARY KEY, reserved_microusd bigint NOT NULL DEFAULT 0 CHECK(reserved_microusd>=0)
);
CREATE INDEX IF NOT EXISTS local_rank_points_pending ON local_rank_points(state,checked_at);
ALTER TABLE local_rank_provider ENABLE ROW LEVEL SECURITY;
ALTER TABLE local_rank_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE local_rank_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE local_rank_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE local_rank_budgets ENABLE ROW LEVEL SECURITY;

-- Serialize all paid dispatches under one row lock. Reservations survive crashes,
-- failures and unknown HTTP outcomes; only queued (never submitted) work is claimed.
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
  WHERE p.state='queued' AND r.period>=month_key
  ORDER BY r.created_at,p.track_id,p.point_index LIMIT allowance FOR UPDATE OF p SKIP LOCKED
 ), claimed AS (
  UPDATE local_rank_points p SET state='submitting',reserved_microusd=600,budget_month=month_key,submitted_at=now()
  FROM eligible e WHERE p.id=e.id RETURNING p.*
 ), budget AS (
  UPDATE local_rank_budgets SET reserved_microusd=reserved_microusd+(SELECT count(*)*600 FROM claimed) WHERE month=month_key
 ) SELECT * FROM claimed;
END $$;
REVOKE ALL ON FUNCTION claim_local_rank_points() FROM PUBLIC;
