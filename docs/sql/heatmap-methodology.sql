ALTER TABLE local_rank_runs ADD COLUMN IF NOT EXISTS methodology text NOT NULL DEFAULT 'maps-v1';
ALTER TABLE local_rank_runs ADD COLUMN IF NOT EXISTS request_key text NOT NULL DEFAULT 'scheduled';
ALTER TABLE local_rank_runs DROP CONSTRAINT IF EXISTS local_rank_runs_business_id_period_key;
DROP INDEX IF EXISTS local_rank_runs_period_method;
CREATE UNIQUE INDEX IF NOT EXISTS local_rank_runs_period_request ON local_rank_runs(business_id,period,methodology,request_key);
ALTER TABLE local_rank_schedules ADD COLUMN IF NOT EXISTS manual_enabled boolean NOT NULL DEFAULT false;
CREATE TABLE IF NOT EXISTS local_rank_quotes (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
 customer_id uuid NOT NULL REFERENCES customers(id), parent text NOT NULL, google_subject text NOT NULL,
 track_id uuid NOT NULL, version integer NOT NULL, settings jsonb NOT NULL, anchor jsonb NOT NULL,
 cost_microusd integer NOT NULL CHECK(cost_microusd BETWEEN 600 AND 29400),
 expires_at timestamptz NOT NULL DEFAULT now()+interval '10 minutes', approved_at timestamptz
);
ALTER TABLE local_rank_quotes ENABLE ROW LEVEL SECURITY;
