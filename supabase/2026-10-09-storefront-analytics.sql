CREATE TABLE IF NOT EXISTS storefront_analytics_sessions (
 id uuid PRIMARY KEY, source varchar(100) NOT NULL, medium varchar(100) NOT NULL, campaign varchar(100), landing_page varchar(200) NOT NULL,
 device varchar(12) NOT NULL, consent boolean NOT NULL DEFAULT true, excluded boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(), last_seen timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS storefront_analytics_events (
 id uuid PRIMARY KEY, session_id uuid NOT NULL REFERENCES storefront_analytics_sessions(id) ON DELETE CASCADE,
 event_name varchar(40) NOT NULL, page varchar(200) NOT NULL, item_id varchar(100), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS storefront_events_session_date ON storefront_analytics_events(session_id,created_at);
CREATE INDEX IF NOT EXISTS storefront_sessions_date ON storefront_analytics_sessions(created_at);
CREATE TABLE IF NOT EXISTS storefront_analytics_checkouts (
 stripe_session_id text PRIMARY KEY, session_id uuid REFERENCES storefront_analytics_sessions(id) ON DELETE SET NULL,
 excluded boolean NOT NULL DEFAULT false, ga_client_id varchar(100), ga_session_id varchar(30), consent boolean NOT NULL DEFAULT false,
 ga_status varchar(30) NOT NULL DEFAULT 'pending', attempts integer NOT NULL DEFAULT 0, last_attempt_at timestamptz,
 purchase_at timestamptz, sent_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE storefront_analytics_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE storefront_analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE storefront_analytics_checkouts ENABLE ROW LEVEL SECURITY;
