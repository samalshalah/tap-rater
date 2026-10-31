BEGIN;

ALTER TABLE google_review_links
  ALTER COLUMN maintenance_due_at DROP NOT NULL,
  ALTER COLUMN draft_due_at DROP NOT NULL;

CREATE OR REPLACE FUNCTION normalize_review_check_schedule() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NOT NEW.enabled THEN
    NEW.maintenance_due_at := NULL;
    NEW.draft_due_at := NULL;
    NEW.next_page := NULL;
    NEW.sync_run := NULL;
    NEW.sync_lock := NULL;
    NEW.sync_lock_until := NULL;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NOT OLD.enabled THEN
      NEW.maintenance_due_at := now();
      NEW.draft_due_at := now();
    END IF;
  END IF;
  RETURN NEW;
END
$$;

CREATE OR REPLACE TRIGGER normalize_review_check_schedule
BEFORE INSERT OR UPDATE ON google_review_links
FOR EACH ROW EXECUTE FUNCTION normalize_review_check_schedule();

CREATE OR REPLACE FUNCTION archive_removed_review_operations() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  UPDATE google_live_reviews
     SET scheduled_at = NULL, auto_schedule_cancelled = true
   WHERE business_id = NEW.id AND publish_state = 'idle'
     AND (scheduled_at IS NOT NULL OR (old_reply_requested_at IS NOT NULL AND NOT auto_schedule_cancelled));

  UPDATE review_worker_alerts SET resolved_at = now()
   WHERE business_id = NEW.id AND resolved_at IS NULL;
  RETURN NULL;
END
$$;

CREATE OR REPLACE TRIGGER archive_removed_review_operations
AFTER UPDATE OF status ON businesses FOR EACH ROW
WHEN (NEW.status = 'marketing_removed')
EXECUTE FUNCTION archive_removed_review_operations();

CREATE OR REPLACE FUNCTION skip_removed_review_alert() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.resolved_at IS NULL THEN
    -- Serialize late worker failures with location removal.
    PERFORM 1 FROM businesses WHERE id = NEW.business_id
      AND status IS DISTINCT FROM 'marketing_removed' FOR SHARE;
    IF NOT FOUND THEN RETURN NULL; END IF;
  END IF;
  RETURN NEW;
END
$$;

CREATE OR REPLACE TRIGGER skip_removed_review_alert
BEFORE INSERT OR UPDATE ON review_worker_alerts
FOR EACH ROW EXECUTE FUNCTION skip_removed_review_alert();

UPDATE google_review_links l SET enabled = false
 FROM businesses b WHERE b.id = l.business_id AND b.status = 'marketing_removed';

UPDATE google_live_reviews r SET scheduled_at = NULL, auto_schedule_cancelled = true
 FROM businesses b WHERE b.id = r.business_id AND b.status = 'marketing_removed'
 AND r.publish_state = 'idle' AND (r.scheduled_at IS NOT NULL OR (r.old_reply_requested_at IS NOT NULL AND NOT r.auto_schedule_cancelled));

UPDATE review_worker_alerts a SET resolved_at = now()
 FROM businesses b WHERE b.id = a.business_id AND b.status = 'marketing_removed' AND a.resolved_at IS NULL;

COMMIT;

