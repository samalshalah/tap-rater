BEGIN;

-- Removal and a customer's explicit cancellation previously used the same flag.
ALTER TABLE google_live_reviews ADD COLUMN IF NOT EXISTS archived_automatic_draft boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION archive_removed_review_operations() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  UPDATE google_live_reviews
     SET archived_automatic_draft = NOT auto_schedule_cancelled AND draft_generated_at IS NOT NULL
           AND version = 2 AND approved_version IS NULL AND attempted_at IS NULL AND NOT suspected_spam,
         scheduled_at = NULL, auto_schedule_cancelled = true
   WHERE business_id = NEW.id AND publish_state = 'idle'
     AND (scheduled_at IS NOT NULL OR (old_reply_requested_at IS NOT NULL AND NOT auto_schedule_cancelled));

  UPDATE review_worker_alerts SET resolved_at = now()
   WHERE business_id = NEW.id AND resolved_at IS NULL;
  RETURN NULL;
END
$$;

-- Run on the history transfer and subsequent fresh imports. Reuse only an
-- untouched, machine-generated reply for an unchanged historical positive review.
CREATE OR REPLACE FUNCTION resume_enrolled_generated_review() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  consent timestamptz;
BEGIN
  IF OLD.business_id IS DISTINCT FROM NEW.business_id THEN
    IF OLD.archived_automatic_draft AND EXISTS (
      SELECT 1 FROM google_review_links prior JOIN google_review_links current
        ON current.business_id=prior.reconnected_to AND current.customer_id=prior.customer_id
       WHERE prior.business_id=OLD.business_id AND current.business_id=NEW.business_id
    ) THEN
      NEW.auto_schedule_cancelled := false;
    END IF;
    NEW.archived_automatic_draft := false;
  END IF;

  IF NEW.auto_schedule_cancelled OR NEW.archived_automatic_draft OR NEW.version<>2 OR NEW.draft=''
     OR NEW.draft_generated_at IS NULL OR NEW.approved_version IS NOT NULL OR NEW.attempted_at IS NOT NULL
     OR NEW.publish_state<>'idle' OR NEW.suspected_spam OR NEW.scheduled_at IS NOT NULL
     OR NEW.fetched_at<=now()-interval '30 days' OR coalesce(NEW.data->'reviewReply'->>'comment','')<>''
     OR NEW.data->>'starRating' NOT IN ('FOUR','FIVE')
  THEN RETURN NEW; END IF;

  SELECT l.consent_at INTO consent FROM google_review_links l
    JOIN businesses b ON b.id=l.business_id AND b.customer_id=l.customer_id
    JOIN customers c ON c.id=b.customer_id
    JOIN google_business_connections g ON g.owner=l.owner AND g.google_subject=l.google_subject
   WHERE l.business_id=NEW.business_id AND l.enabled AND l.auto_enabled AND l.ai_consent
     AND c.account_status='active' AND b.status IS DISTINCT FROM 'marketing_removed'
     AND marketing_location_allowed(b.id) AND NEW.draft_generated_at<=l.consent_at
     AND NULLIF(NEW.data->>'createTime','')::timestamptz<=l.consent_at
     AND ((NEW.data->>'starRating'='FIVE' AND l.auto_five) OR (NEW.data->>'starRating'='FOUR' AND l.auto_four));
  IF consent IS NOT NULL THEN
    NEW.old_reply_requested_at := coalesce(NEW.old_reply_requested_at,now());
    NEW.scheduled_at := greatest(now(),NEW.old_reply_requested_at+interval '1 hour');
    NEW.scheduled_version := NEW.version;
    NEW.schedule_consent_at := consent;
    NEW.schedule_failures := 0;
  END IF;
  RETURN NEW;
END
$$;

CREATE OR REPLACE TRIGGER resume_enrolled_generated_review
BEFORE UPDATE OF business_id,fetched_at ON google_live_reviews FOR EACH ROW
WHEN (OLD.archived_automatic_draft OR (NEW.draft_generated_at IS NOT NULL AND NEW.version=2 AND NEW.scheduled_at IS NULL))
EXECUTE FUNCTION resume_enrolled_generated_review();

COMMIT;
