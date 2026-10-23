BEGIN;
ALTER TABLE marketing_subscriptions ADD COLUMN IF NOT EXISTS activation_email_sent_at timestamptz;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS marketing_onboarding_completed_at timestamptz,
 ADD COLUMN IF NOT EXISTS marketing_onboarding_business_id uuid REFERENCES businesses(id) ON DELETE SET NULL;
-- Existing connected customers do not need to repeat enrollment.
UPDATE customers c SET marketing_onboarding_completed_at=now()
 WHERE marketing_onboarding_completed_at IS NULL AND EXISTS(SELECT 1 FROM google_review_links l WHERE l.customer_id=c.id AND l.enabled AND l.synced_at IS NOT NULL);
COMMIT;
