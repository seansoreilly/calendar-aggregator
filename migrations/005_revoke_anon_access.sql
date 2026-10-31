-- Security: the app now talks to Supabase with the service-role key
-- (SUPABASE_SERVICE_ROLE_KEY, server-only). The public anon key must no longer
-- reach calendar_aggregator.collections (it exposed every management_token).
--
-- DEPLOY ORDER: ship the service-role code and set SUPABASE_SERVICE_ROLE_KEY
-- in the deployment BEFORE applying this migration, or the app loses DB access.

DROP POLICY IF EXISTS "Allow anon full access" ON calendar_aggregator.collections;

REVOKE ALL ON TABLE calendar_aggregator.collections FROM anon, authenticated;

-- service_role bypasses RLS but still needs table privileges (idempotent).
GRANT USAGE ON SCHEMA calendar_aggregator TO service_role;
GRANT ALL ON TABLE calendar_aggregator.collections TO service_role;
