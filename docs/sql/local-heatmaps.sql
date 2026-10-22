CREATE TABLE IF NOT EXISTS local_heatmap_locations (
 business_id uuid PRIMARY KEY REFERENCES businesses(id) ON DELETE CASCADE,
 customer_id uuid NOT NULL REFERENCES customers(id),
 parent text NOT NULL,
 google_subject text NOT NULL,
 anchor jsonb NOT NULL,
 synced_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS local_heatmap_tracks (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 business_id uuid NOT NULL REFERENCES local_heatmap_locations(business_id) ON DELETE CASCADE,
 customer_id uuid NOT NULL REFERENCES customers(id),
 parent text NOT NULL,
 google_subject text NOT NULL,
 slot smallint NOT NULL CHECK (slot BETWEEN 1 AND 20),
 keyword text NOT NULL CHECK (char_length(keyword) BETWEEN 2 AND 120),
 settings jsonb NOT NULL,
 active boolean NOT NULL DEFAULT true,
 version integer NOT NULL DEFAULT 1,
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE (business_id,slot)
);
CREATE UNIQUE INDEX IF NOT EXISTS local_heatmap_keyword_unique ON local_heatmap_tracks(business_id,lower(keyword));
ALTER TABLE local_heatmap_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE local_heatmap_tracks ENABLE ROW LEVEL SECURITY;
