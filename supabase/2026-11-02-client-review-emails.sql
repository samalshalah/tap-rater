BEGIN;
CREATE TABLE review_email_preferences (
 business_id uuid PRIMARY KEY REFERENCES businesses(id) ON DELETE CASCADE,
 customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
 low_mode text NOT NULL CHECK(low_mode IN ('off','immediate','daily')),
 high_mode text NOT NULL CHECK(high_mode IN ('off','immediate','daily')),
 weekly boolean NOT NULL, monthly boolean NOT NULL, zone text NOT NULL,
 delivery_hour integer NOT NULL CHECK(delivery_hour BETWEEN 0 AND 23),
 version integer NOT NULL DEFAULT 1, changed_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE review_email_queue (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 business_id uuid NOT NULL REFERENCES review_email_preferences(business_id) ON DELETE CASCADE,
 customer_id uuid NOT NULL, pref_version integer NOT NULL, kind text NOT NULL,
 event_key text NOT NULL, due_at timestamptz NOT NULL,
 low_count integer NOT NULL DEFAULT 0, high_count integer NOT NULL DEFAULT 0,
 rating integer, period_start timestamptz, period_end timestamptz, previous_start timestamptz,
 attempts integer NOT NULL DEFAULT 0, first_attempt timestamptz, claim uuid, retry_at timestamptz,
 message jsonb, finished_at timestamptz, result text,
 UNIQUE(business_id,kind,event_key)
);
ALTER TABLE review_email_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_email_queue ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON review_email_preferences,review_email_queue FROM PUBLIC;
CREATE INDEX review_email_due ON review_email_queue(due_at) WHERE finished_at IS NULL;
CREATE FUNCTION enqueue_new_review_email() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE pref review_email_preferences%ROWTYPE; stars integer; mode text; due timestamptz; local_day date; written timestamptz;
BEGIN
 SELECT p.* INTO pref FROM review_email_preferences p
 JOIN google_review_links l ON l.business_id=p.business_id AND l.customer_id=p.customer_id
 WHERE p.business_id=NEW.business_id AND l.enabled AND marketing_location_allowed(p.business_id);
 IF NOT FOUND OR nullif(NEW.data->>'createTime','') IS NULL THEN RETURN NEW; END IF;
 BEGIN
   written:=(NEW.data->>'createTime')::timestamptz;
 EXCEPTION WHEN invalid_datetime_format OR datetime_field_overflow THEN RETURN NEW;
 END;
 IF written < pref.changed_at THEN RETURN NEW; END IF;
 stars:=array_position(ARRAY['ONE','TWO','THREE','FOUR','FIVE'],NEW.data->>'starRating');
 IF stars IS NULL THEN RETURN NEW; END IF;
 mode:=CASE WHEN stars<=3 THEN pref.low_mode ELSE pref.high_mode END;
 IF mode='immediate' THEN
   INSERT INTO review_email_queue(business_id,customer_id,pref_version,kind,event_key,due_at,rating)
   VALUES(NEW.business_id,pref.customer_id,pref.version,'review',NEW.resource,now(),stars)
   ON CONFLICT DO NOTHING;
 ELSIF mode='daily' THEN
   local_day:=(now() AT TIME ZONE pref.zone)::date;
   due:=(local_day+make_interval(hours=>pref.delivery_hour)) AT TIME ZONE pref.zone;
   IF due<=now() THEN due:=((local_day+1)+make_interval(hours=>pref.delivery_hour)) AT TIME ZONE pref.zone; END IF;
   INSERT INTO review_email_queue(business_id,customer_id,pref_version,kind,event_key,due_at,low_count,high_count)
   VALUES(NEW.business_id,pref.customer_id,pref.version,'daily',pref.version||'/'||((due AT TIME ZONE pref.zone)::date),due,(stars<=3)::int,(stars>=4)::int)
   ON CONFLICT(business_id,kind,event_key) DO UPDATE SET low_count=review_email_queue.low_count+EXCLUDED.low_count,high_count=review_email_queue.high_count+EXCLUDED.high_count;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER review_email_after_import AFTER INSERT ON google_live_reviews FOR EACH ROW EXECUTE FUNCTION enqueue_new_review_email();
CREATE FUNCTION stop_location_email() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 UPDATE review_email_preferences SET low_mode='off',high_mode='off',weekly=false,monthly=false,
 version=version+1,changed_at=now() WHERE business_id=NEW.business_id;
 RETURN NEW;
END $$;
CREATE TRIGGER review_email_stop AFTER UPDATE OF enabled ON google_review_links FOR EACH ROW WHEN (OLD.enabled AND NOT NEW.enabled) EXECUTE FUNCTION stop_location_email();
COMMIT;
