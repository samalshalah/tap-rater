-- Null means not captured; [] means the provider returned no organic competitors.
ALTER TABLE local_rank_points ADD COLUMN IF NOT EXISTS competitors jsonb CHECK (competitors IS NULL OR (jsonb_typeof(competitors)='array' AND jsonb_array_length(competitors)<=20));
