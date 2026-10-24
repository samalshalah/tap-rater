-- Bound each location to 20 AI reservations in a rolling hour, not a day.
ALTER TABLE google_review_links ADD COLUMN IF NOT EXISTS ai_hour_reservations timestamptz[] NOT NULL DEFAULT '{}';

CREATE OR REPLACE FUNCTION reserve_review_ai_hour(target_business uuid)
RETURNS boolean LANGUAGE plpgsql AS $$
DECLARE
  link google_review_links%ROWTYPE;
  recent timestamptz[];
  reservation_time timestamptz;
BEGIN
  -- Serializes manual and worker reservations for the same location.
  SELECT * INTO link FROM google_review_links WHERE business_id=target_business FOR UPDATE;
  IF NOT FOUND OR NOT link.enabled OR NOT link.ai_consent THEN RETURN false; END IF;
  reservation_time := clock_timestamp();
  SELECT coalesce(array_agg(t), '{}'::timestamptz[]) INTO recent
    FROM unnest(link.ai_hour_reservations) AS t
    WHERE t > reservation_time - interval '1 hour';
  IF cardinality(recent) >= 20 OR link.ai_last_at > reservation_time - interval '10 seconds' THEN
    RETURN false;
  END IF;
  UPDATE google_review_links SET ai_hour_reservations=array_append(recent,reservation_time), ai_last_at=reservation_time,
    ai_day=current_date, ai_calls=CASE WHEN ai_day=current_date THEN ai_calls+1 ELSE 1 END
    WHERE business_id=target_business;
  RETURN true;
END;
$$;
