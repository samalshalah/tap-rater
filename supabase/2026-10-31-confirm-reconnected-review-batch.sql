BEGIN;

CREATE FUNCTION resume_confirmed_historical_reply() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  -- The automatic backlog selector excludes cancelled reviews. A new request
  -- on a cancelled review comes from the customer's confirmed older-review batch.
  IF NEW.draft = '' AND NEW.draft_generated_at IS NULL AND NEW.approved_version IS NULL
     AND NEW.publish_state = 'idle' AND NEW.scheduled_at IS NULL AND NOT NEW.suspected_spam
     AND coalesce(NEW.data->'reviewReply'->>'comment','') = ''
     AND NEW.fetched_at > now() - interval '30 days'
     AND EXISTS (
       SELECT 1 FROM google_review_links l WHERE l.business_id = NEW.business_id
         AND l.enabled AND l.ai_consent AND l.auto_enabled AND marketing_location_allowed(l.business_id)
         AND (NEW.data->>'createTime')::timestamptz <= l.consent_at
         AND ((NEW.data->>'starRating' = 'FOUR' AND l.auto_four)
           OR (NEW.data->>'starRating' = 'FIVE' AND l.auto_five))
     ) THEN
    NEW.auto_schedule_cancelled := false;
  END IF;
  RETURN NEW;
END
$$;

CREATE TRIGGER resume_confirmed_historical_reply
BEFORE UPDATE OF old_reply_requested_at ON google_live_reviews
FOR EACH ROW WHEN (OLD.auto_schedule_cancelled AND NEW.auto_schedule_cancelled
  AND OLD.old_reply_requested_at IS NULL AND NEW.old_reply_requested_at IS NOT NULL)
EXECUTE FUNCTION resume_confirmed_historical_reply();

COMMIT;
