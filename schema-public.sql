-- Calendar Aggregator Collections table for persistent storage
-- Uses public schema for simplicity
-- Replaces the in-memory globalThis.calendarCollections storage

-- Create collections table in the public schema
CREATE TABLE IF NOT EXISTS calendar_aggregator.collections (
  guid UUID PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  sources JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Grant table permissions to anon and authenticated roles
GRANT ALL ON calendar_aggregator.collections TO anon, authenticated;

-- Index for efficient sorting and filtering by creation time
CREATE INDEX IF NOT EXISTS idx_collections_created_at ON calendar_aggregator.collections(created_at);

-- Index for searching by name (case-insensitive)
CREATE INDEX IF NOT EXISTS idx_collections_name_lower ON calendar_aggregator.collections(LOWER(name));

-- Enable Row Level Security for future authentication needs
ALTER TABLE calendar_aggregator.collections ENABLE ROW LEVEL SECURITY;

-- Default policy: Allow all operations for collections
-- Allow all operations for now since there's no authentication yet
CREATE POLICY IF NOT EXISTS "Allow all operations on collections" ON calendar_aggregator.collections
  FOR ALL 
  USING (true)
  WITH CHECK (true);