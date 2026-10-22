BEGIN;
CREATE TABLE IF NOT EXISTS admin_pricing_scenarios (
 id uuid PRIMARY KEY,
 name text NOT NULL CHECK(char_length(name) BETWEEN 1 AND 80),
 model_version text NOT NULL CHECK(model_version='2026-10-22-v1'),
 plans jsonb NOT NULL CHECK(jsonb_typeof(plans)='array' AND jsonb_array_length(plans)=3),
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE admin_pricing_scenarios ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON admin_pricing_scenarios FROM PUBLIC;
COMMIT;
