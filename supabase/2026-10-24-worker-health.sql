CREATE TABLE IF NOT EXISTS system_worker_health (
 name text PRIMARY KEY,
 run_id uuid NOT NULL,
 started_at timestamptz NOT NULL DEFAULT now(),
 finished_at timestamptz,
 succeeded_at timestamptz,
 status text NOT NULL CHECK (status IN ('running','success','failed')),
 failures integer NOT NULL DEFAULT 0,
 metrics jsonb NOT NULL DEFAULT '{}'
);
