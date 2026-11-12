ALTER TABLE public.google_review_links
  ADD COLUMN IF NOT EXISTS ai_hourly_limit_override integer
  CHECK (ai_hourly_limit_override BETWEEN 1 AND 60);

CREATE OR REPLACE FUNCTION public.reserve_review_ai_hour(target_business uuid)
RETURNS boolean LANGUAGE plpgsql AS $$
DECLARE
  link public.google_review_links%ROWTYPE;
  recent timestamptz[];
  reservation_time timestamptz;
BEGIN
  SELECT * INTO link FROM public.google_review_links WHERE business_id=target_business FOR UPDATE;
  IF NOT FOUND OR NOT link.enabled OR NOT link.ai_consent THEN RETURN false; END IF;

  reservation_time := clock_timestamp();
  SELECT coalesce(array_agg(t), '{}'::timestamptz[]) INTO recent
  FROM unnest(link.ai_hour_reservations) AS t
  WHERE t > reservation_time - interval '1 hour';

  IF cardinality(recent) >= coalesce(link.ai_hourly_limit_override,20)
    OR link.ai_last_at > reservation_time - interval '10 seconds' THEN
    RETURN false;
  END IF;

  UPDATE public.google_review_links
  SET ai_hour_reservations=array_append(recent,reservation_time), ai_last_at=reservation_time,
      ai_day=current_date, ai_calls=CASE WHEN ai_day=current_date THEN ai_calls+1 ELSE 1 END
  WHERE business_id=target_business;
  RETURN true;
END;
$$;
