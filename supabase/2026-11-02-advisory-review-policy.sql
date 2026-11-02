BEGIN;
ALTER TABLE google_live_reviews ADD COLUMN policy_check jsonb, ADD COLUMN policy_claim uuid, ADD COLUMN policy_retry_at timestamptz;
ALTER TABLE ai_usage_events DROP CONSTRAINT ai_usage_events_service_check;
ALTER TABLE ai_usage_events ADD CONSTRAINT ai_usage_events_service_check CHECK(service IN ('review_manual','review_automatic','sample_manual','sample_automatic','profile_fix','review_policy'));
CREATE INDEX review_policy_pending ON google_live_reviews(created_at DESC)
 WHERE policy_check IS NULL AND data->>'starRating' IN ('ONE','TWO','THREE') AND length(trim(coalesce(data->>'comment','')))>0;
CREATE FUNCTION invalidate_review_policy_check() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 NEW.policy_check:=NULL; NEW.policy_retry_at:=NULL; NEW.policy_claim:=NULL;
 RETURN NEW;
END $$;
CREATE TRIGGER invalidate_review_policy_check BEFORE UPDATE OF data ON google_live_reviews FOR EACH ROW
 WHEN (OLD.data->>'comment' IS DISTINCT FROM NEW.data->>'comment' OR OLD.data->>'starRating' IS DISTINCT FROM NEW.data->>'starRating')
 EXECUTE FUNCTION invalidate_review_policy_check();
COMMIT;
