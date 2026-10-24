ALTER TABLE google_profile_drafts
 ADD COLUMN IF NOT EXISTS publish_state text NOT NULL DEFAULT 'idle' CHECK (publish_state IN ('idle','publishing','uncertain','submitted')),
 ADD COLUMN IF NOT EXISTS publish_attempt uuid,
 ADD COLUMN IF NOT EXISTS publish_plan jsonb,
 ADD COLUMN IF NOT EXISTS submitted_at timestamptz;
