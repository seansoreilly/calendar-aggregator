-- Migration 002: Change guid column from UUID to TEXT type
-- File: migrations/002_guid_text_type.sql  
-- Purpose: Allow custom IDs (non-UUID strings) to be stored in guid column

-- Step 1: Change the guid column type from UUID to TEXT
-- This allows both UUIDs and custom IDs like 'my-work-schedule'
ALTER TABLE calendar_aggregator.collections 
  ALTER COLUMN guid TYPE TEXT;

-- Step 2: Recreate the name index to ensure it still works with TEXT type
-- (The existing indexes should continue to work, but being explicit)
DROP INDEX IF EXISTS idx_collections_name_lower;
CREATE INDEX IF NOT EXISTS idx_collections_name_lower 
  ON calendar_aggregator.collections(LOWER(name));

-- Step 3: Add index for efficient guid lookups (case-sensitive and case-insensitive)
-- This replaces the automatic primary key index optimization for UUID
CREATE INDEX IF NOT EXISTS idx_collections_guid 
  ON calendar_aggregator.collections(guid);

-- Case-insensitive index for custom ID lookups
CREATE INDEX IF NOT EXISTS idx_collections_guid_lower 
  ON calendar_aggregator.collections(LOWER(guid));

-- Step 4: Add constraint to ensure guid is not empty
ALTER TABLE calendar_aggregator.collections 
  ADD CONSTRAINT IF NOT EXISTS guid_not_empty 
  CHECK (guid IS NOT NULL AND LENGTH(TRIM(guid)) > 0);

-- Step 5: Update the gen_random_uuid() default to cast to TEXT
-- (This ensures new records without explicit guid still get UUIDs)
ALTER TABLE calendar_aggregator.collections 
  ALTER COLUMN guid SET DEFAULT gen_random_uuid()::TEXT;

-- Step 6: Add helpful comments
COMMENT ON COLUMN calendar_aggregator.collections.guid IS 
  'Unique identifier: either UUID or custom string (3-50 chars, URL-safe)';
COMMENT ON INDEX idx_collections_guid IS 
  'Primary index for guid lookups (case-sensitive)';
COMMENT ON INDEX idx_collections_guid_lower IS 
  'Index for case-insensitive guid lookups (custom IDs)';