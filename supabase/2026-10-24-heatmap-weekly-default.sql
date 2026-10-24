-- Existing campaigns keep their approved four-date cadence. New campaigns default to weekly.
-- This does not enable any campaign or provider, or create any scan.
ALTER TABLE local_rank_schedules ADD COLUMN IF NOT EXISTS cadence text NOT NULL DEFAULT 'four_monthly'
 CHECK (cadence IN ('weekly','four_monthly'));
ALTER TABLE local_rank_schedules ALTER COLUMN cadence SET DEFAULT 'weekly';
