CREATE TABLE IF NOT EXISTS local_issue_access (
 business_id uuid PRIMARY KEY REFERENCES businesses(id) ON DELETE CASCADE,
 customer_id uuid NOT NULL REFERENCES customers(id), parent text NOT NULL, google_subject text NOT NULL,
 preview_enabled boolean NOT NULL DEFAULT false, ai_day date, ai_calls integer NOT NULL DEFAULT 0, ai_last_at timestamptz
);
CREATE TABLE IF NOT EXISTS local_issue_notes (
 business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE, customer_id uuid NOT NULL REFERENCES customers(id),
 parent text NOT NULL, google_subject text NOT NULL, code text NOT NULL, finding jsonb NOT NULL,
 active boolean NOT NULL DEFAULT true, PRIMARY KEY(business_id,parent,google_subject,code)
);
CREATE TABLE IF NOT EXISTS local_issues (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
 customer_id uuid NOT NULL REFERENCES customers(id), parent text NOT NULL, google_subject text NOT NULL,
 code text NOT NULL, fingerprint text NOT NULL, finding jsonb NOT NULL, active boolean NOT NULL DEFAULT true,
 read_at timestamptz, requested_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(business_id,parent,google_subject,code)
);
CREATE TABLE IF NOT EXISTS local_issue_drafts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), issue_id uuid NOT NULL REFERENCES local_issues(id) ON DELETE CASCADE,
 fingerprint text NOT NULL, status text NOT NULL CHECK(status IN ('generating','draft','failed')),
 content jsonb, attempt_at timestamptz NOT NULL DEFAULT now(), approved_at timestamptz,
 UNIQUE(issue_id,fingerprint)
);
ALTER TABLE local_issue_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE local_issue_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE local_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE local_issue_drafts ENABLE ROW LEVEL SECURITY;

ALTER TABLE local_issue_drafts ADD COLUMN IF NOT EXISTS attempt_token uuid NOT NULL DEFAULT gen_random_uuid();
