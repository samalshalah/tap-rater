BEGIN;
CREATE TABLE IF NOT EXISTS local_directory_listings (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
 customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
 directory text NOT NULL CHECK (length(directory) BETWEEN 1 AND 100),
 status text NOT NULL DEFAULT 'not_checked' CHECK (status IN ('not_checked','listed','needs_update','missing','unavailable')),
 listing_url text NOT NULL DEFAULT '',
 listed_name text NOT NULL DEFAULT '',
 listed_address text NOT NULL DEFAULT '',
 listed_phone text NOT NULL DEFAULT '',
 notes text NOT NULL DEFAULT '',
 version integer NOT NULL DEFAULT 1,
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE (business_id, directory)
);
ALTER TABLE local_directory_listings ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES customers(id) ON DELETE CASCADE;
UPDATE local_directory_listings d SET customer_id=b.customer_id FROM businesses b WHERE d.business_id=b.id AND d.customer_id IS NULL;
ALTER TABLE local_directory_listings ALTER COLUMN customer_id SET NOT NULL;
ALTER TABLE local_directory_listings ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS local_directory_listings_business_idx ON local_directory_listings(business_id);
COMMIT;
