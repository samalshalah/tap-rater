BEGIN;

ALTER TABLE marketing_location_access
  ADD COLUMN IF NOT EXISTS ai_monthly_limit_override integer
  CHECK (ai_monthly_limit_override BETWEEN 0 AND 100000);

CREATE OR REPLACE FUNCTION public.reserve_marketing_units(location_id uuid, service_name text, amount integer, key text)
 RETURNS boolean
 LANGUAGE plpgsql
AS $function$
DECLARE a customer_marketing_access%ROWTYPE; used bigint; cap integer;
 month_key date:=date_trunc('month',now() AT TIME ZONE 'America/New_York')::date;
BEGIN
 IF amount<=0 OR service_name NOT IN ('ai','heatmap') OR key IS NULL OR length(key)>200 THEN RETURN false; END IF;
 SELECT ma.* INTO a FROM customer_marketing_access ma JOIN businesses b ON b.customer_id=ma.customer_id
 WHERE b.id=location_id FOR UPDATE OF ma;
 IF NOT FOUND OR NOT marketing_location_allowed(location_id) THEN RETURN false; END IF;
 IF EXISTS(SELECT 1 FROM marketing_usage_reservations WHERE business_id=location_id AND service=service_name AND request_key=key AND units=amount AND month=month_key) THEN RETURN true; END IF;
 cap:=CASE WHEN service_name='ai' THEN coalesce((SELECT m.ai_monthly_limit_override FROM marketing_location_access m WHERE m.business_id=location_id AND m.customer_id=a.customer_id AND m.enabled),a.ai_monthly_limit) ELSE a.heatmap_monthly_points END;
 SELECT coalesce(sum(units),0) INTO used FROM marketing_usage_reservations WHERE business_id=location_id AND service=service_name AND month=month_key;
 IF used+amount>cap THEN RETURN false; END IF;
 IF service_name='ai' AND a.source='paid' THEN
  SELECT coalesce(sum(units),0) INTO used FROM marketing_usage_reservations WHERE business_id=location_id AND service='ai' AND month=month_key AND (request_key LIKE 'profile:%')=(key LIKE 'profile:%');
  IF used+amount>(CASE WHEN key LIKE 'profile:%' THEN 10 ELSE cap END) THEN RETURN false; END IF;
 END IF;
 INSERT INTO marketing_usage_reservations(business_id,customer_id,month,service,request_key,units)
 VALUES(location_id,a.customer_id,month_key,service_name,key,amount) ON CONFLICT DO NOTHING;
 RETURN FOUND;
END $function$;

COMMIT;
