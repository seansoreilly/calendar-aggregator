-- Enhanced Calendar Aggregator Schema Migration
-- File: migrations/001_enhanced_schema.sql
-- Purpose: Apply improvements to existing calendar_aggregator.collections table

-- Add gen_random_uuid() default to guid column
ALTER TABLE calendar_aggregator.collections 
  ALTER COLUMN guid SET DEFAULT gen_random_uuid();

-- Add GIN index for efficient JSONB queries on sources field
CREATE INDEX IF NOT EXISTS idx_collections_sources_gin 
  ON calendar_aggregator.collections USING GIN(sources);

-- Create trigger function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION calendar_aggregator.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at on row updates
DROP TRIGGER IF EXISTS update_collections_updated_at ON calendar_aggregator.collections;
CREATE TRIGGER update_collections_updated_at
  BEFORE UPDATE ON calendar_aggregator.collections
  FOR EACH ROW
  EXECUTE FUNCTION calendar_aggregator.update_updated_at_column();

-- Create JSONB validation function for sources field
CREATE OR REPLACE FUNCTION calendar_aggregator.validate_calendar_sources(sources JSONB)
RETURNS BOOLEAN AS $$
BEGIN
  -- Ensure sources is an array
  IF jsonb_typeof(sources) != 'array' THEN
    RETURN FALSE;
  END IF;
  
  -- Validate each source object has required fields
  IF EXISTS (
    SELECT 1 
    FROM jsonb_array_elements(sources) AS source
    WHERE NOT (
      source ? 'id' AND
      source ? 'url' AND
      source ? 'name' AND
      source ? 'color' AND
      source ? 'enabled' AND
      source ? 'createdAt'
    )
  ) THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Add check constraint for sources validation
ALTER TABLE calendar_aggregator.collections 
  ADD CONSTRAINT IF NOT EXISTS valid_calendar_sources 
  CHECK (calendar_aggregator.validate_calendar_sources(sources));

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION calendar_aggregator.update_updated_at_column() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION calendar_aggregator.validate_calendar_sources(JSONB) TO anon, authenticated;

-- Add helpful comments
COMMENT ON TABLE calendar_aggregator.collections IS 'Calendar collections with GUID-based identification';
COMMENT ON COLUMN calendar_aggregator.collections.guid IS 'Unique identifier, defaults to gen_random_uuid()';
COMMENT ON COLUMN calendar_aggregator.collections.sources IS 'JSONB array of calendar sources with validation';
COMMENT ON INDEX idx_collections_sources_gin IS 'GIN index for efficient JSONB queries on calendar sources';