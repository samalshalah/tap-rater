BEGIN;
CREATE TABLE IF NOT EXISTS review_workspaces (
 business_id uuid PRIMARY KEY REFERENCES businesses(id) ON DELETE CASCADE,
 mode text NOT NULL DEFAULT 'sample' CHECK (mode = 'sample'),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS workspace_sample_reviews (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 business_id uuid NOT NULL REFERENCES review_workspaces(business_id) ON DELETE CASCADE,
 sample_key text NOT NULL,
 reviewer text NOT NULL,
 rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
 comment text NOT NULL,
 reply text NOT NULL DEFAULT '' CHECK (char_length(reply) <= 4000),
 status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','ready')),
 version integer NOT NULL DEFAULT 1,
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE (business_id, sample_key),
 CHECK (status <> 'ready' OR char_length(trim(reply)) > 0)
);
ALTER TABLE review_workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_sample_reviews ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON review_workspaces, workspace_sample_reviews FROM PUBLIC;
COMMIT;
