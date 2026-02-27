-- Fix: Allow anon role to access collections table
-- The app uses the Supabase anon key, but the only RLS policy was for service_role.
-- This caused all reads/writes to silently fail and fall back to empty in-memory storage.

CREATE POLICY "Allow anon full access"
  ON calendar_aggregator.collections
  FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);
