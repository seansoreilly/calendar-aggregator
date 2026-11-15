-- 007_rls_and_function_grants.sql
--
-- MANUAL APPLY ONLY: the repository owner (Sean) applies this migration by hand.
-- Agents and automated tooling must NOT apply it to any database.
--
-- Defence in depth for the shared Supabase project (anon key is public):
--   1. Make sure RLS is enabled on the collections table. With no policies
--      (005 dropped the anon one) anon/authenticated get zero rows even if a
--      table grant is ever re-added. service_role bypasses RLS, so the app is
--      unaffected. Idempotent.
--   2. Revoke EXECUTE on the helper functions that 001 granted to anon and
--      authenticated (and the implicit PUBLIC grant). They are trigger/check
--      helpers only; nothing calls them over PostgREST.
--   3. Revoke schema USAGE from anon/authenticated so the schema is not
--      reachable through the Data API with the public key.
-- Safe to re-run. To roll back, re-grant the privileges removed below.

ALTER TABLE calendar_aggregator.collections ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE calendar_aggregator.collections FROM anon, authenticated;

REVOKE EXECUTE ON FUNCTION calendar_aggregator.update_updated_at_column()
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION calendar_aggregator.validate_calendar_sources(JSONB)
  FROM PUBLIC, anon, authenticated;

REVOKE USAGE ON SCHEMA calendar_aggregator FROM anon, authenticated;
