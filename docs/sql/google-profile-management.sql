CREATE TABLE IF NOT EXISTS google_profile_drafts (
 business_id uuid PRIMARY KEY REFERENCES businesses(id) ON DELETE CASCADE,
 parent text NOT NULL, google_subject text NOT NULL,
 observed jsonb NOT NULL, draft jsonb, version integer NOT NULL DEFAULT 1,
 synced_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE google_profile_drafts ENABLE ROW LEVEL SECURITY;
