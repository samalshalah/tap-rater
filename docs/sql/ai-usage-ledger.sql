BEGIN;
CREATE TABLE IF NOT EXISTS ai_usage_tracking (
 id boolean PRIMARY KEY DEFAULT true CHECK(id), started_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO ai_usage_tracking(id) VALUES(true) ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS ai_usage_events (
 id uuid PRIMARY KEY,
 customer_id uuid NOT NULL,
 business_id uuid NOT NULL,
 service text NOT NULL CHECK(service IN ('review_manual','review_automatic','sample_manual','sample_automatic','profile_fix')),
 model text NOT NULL,
 rate_version text NOT NULL,
 input_nano_usd_per_token integer NOT NULL CHECK(input_nano_usd_per_token>=0),
 output_nano_usd_per_token integer NOT NULL CHECK(output_nano_usd_per_token>=0),
 status text NOT NULL DEFAULT 'started' CHECK(status IN ('started','measured','usage_missing','provider_error')),
 input_tokens bigint CHECK(input_tokens>=0),output_tokens bigint CHECK(output_tokens>=0),
 cost_nano_usd bigint CHECK(cost_nano_usd>=0),
 started_at timestamptz NOT NULL DEFAULT now(),finished_at timestamptz,
 CHECK((status='measured' AND input_tokens IS NOT NULL AND output_tokens IS NOT NULL AND cost_nano_usd IS NOT NULL)
   OR (status<>'measured' AND input_tokens IS NULL AND output_tokens IS NULL AND cost_nano_usd IS NULL))
);
-- Immutable account/location IDs preserve historical attribution if ownership changes.
-- Deliberately no payload, prompt, response, error text, contact information, or profile fields.
CREATE INDEX IF NOT EXISTS ai_usage_events_account_time ON ai_usage_events(customer_id,started_at);
CREATE INDEX IF NOT EXISTS ai_usage_events_location_time ON ai_usage_events(business_id,started_at);
ALTER TABLE ai_usage_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage_tracking ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ai_usage_events,ai_usage_tracking FROM PUBLIC;
COMMIT;
