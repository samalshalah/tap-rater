CREATE TABLE IF NOT EXISTS admin_review_setting_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  admin_email text NOT NULL,
  action text NOT NULL CHECK (action IN ('settings','delay')),
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS admin_review_setting_audit_location_created_idx
  ON admin_review_setting_audit (business_id, created_at DESC);

ALTER TABLE admin_review_setting_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON admin_review_setting_audit FROM PUBLIC;
