BEGIN;
-- Explicit opt-in enables controls without enrolling an existing account in new billing rules.
CREATE TABLE IF NOT EXISTS reviews_service_pause_accounts (
 customer_id uuid PRIMARY KEY REFERENCES customers(id),
 enabled_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON reviews_service_pause_accounts FROM PUBLIC;
CREATE OR REPLACE FUNCTION review_service_pause_allowed(account_id uuid) RETURNS boolean
LANGUAGE sql STABLE AS $$
 SELECT EXISTS(SELECT 1 FROM reviews_period_licences WHERE customer_id=account_id)
 OR EXISTS(SELECT 1 FROM reviews_service_pause_accounts WHERE customer_id=account_id)
$$;
REVOKE ALL ON FUNCTION review_service_pause_allowed(uuid) FROM PUBLIC;

CREATE OR REPLACE FUNCTION protect_review_service_pause() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.service_paused THEN
  IF NOT review_service_pause_allowed(NEW.customer_id) THEN
   RAISE EXCEPTION 'Service pause is not enabled for this account.';
  END IF;
  -- Reconnecting Google must not implicitly resume a deliberately paused service.
  NEW.enabled:=false;
 END IF;
 RETURN NEW;
END $$;
CREATE OR REPLACE TRIGGER a_review_service_pause BEFORE INSERT OR UPDATE OF enabled,service_paused ON google_review_links
 FOR EACH ROW EXECUTE FUNCTION protect_review_service_pause();

CREATE OR REPLACE FUNCTION set_review_service_paused(account_email text, location_id uuid, paused boolean, expected_version integer)
RETURNS TABLE(business_id uuid,service_paused boolean,settings_version integer) LANGUAGE plpgsql AS $$
BEGIN
 RETURN QUERY UPDATE google_review_links l SET service_paused=paused,enabled=NOT paused,
  settings_version=l.settings_version+1,sync_lock=NULL,sync_lock_until=NULL,
  maintenance_due_at=CASE WHEN paused THEN l.maintenance_due_at ELSE now() END,
  draft_due_at=CASE WHEN paused THEN l.draft_due_at ELSE greatest(now(),l.draft_due_at) END
 FROM businesses b JOIN customers c ON c.id=b.customer_id LEFT JOIN reviews_period_licences p ON p.customer_id=c.id
 WHERE l.business_id=location_id AND b.id=l.business_id AND l.customer_id=c.id
  AND review_service_pause_allowed(c.id) AND lower(c.email)=lower(account_email) AND c.account_status='active'
  AND b.status IS DISTINCT FROM 'marketing_removed' AND l.settings_version=expected_version
  AND l.service_paused IS DISTINCT FROM paused
  AND (paused OR (marketing_location_allowed(b.id) AND (p.customer_id IS NULL OR p.period_end>now()) AND EXISTS(
   SELECT 1 FROM google_business_connections g WHERE g.owner=l.owner AND g.google_subject=l.google_subject)))
 RETURNING l.business_id,l.service_paused,l.settings_version;
END $$;

-- Discard results of work already in flight when Pause was selected. No existing drafts are deleted.
CREATE OR REPLACE FUNCTION guard_paused_review_results() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE paused boolean;
BEGIN
 -- Serialize result writes with Pause so no new result commits after Pause completes.
 SELECT l.service_paused INTO paused FROM google_review_links l
  WHERE l.business_id=NEW.business_id AND review_service_pause_allowed(l.customer_id) FOR SHARE OF l;
 IF paused THEN RETURN NULL; END IF;
 RETURN NEW;
END $$;
CREATE OR REPLACE TRIGGER paused_review_results BEFORE INSERT OR UPDATE OF data,draft,draft_generated_at ON google_live_reviews
 FOR EACH ROW EXECUTE FUNCTION guard_paused_review_results();
REVOKE ALL ON FUNCTION protect_review_service_pause(),set_review_service_paused(text,uuid,boolean,integer),guard_paused_review_results() FROM PUBLIC;
COMMIT;
