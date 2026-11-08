-- 006_pin_function_search_path.sql
--
-- MANUAL APPLY ONLY: the repository owner applies this migration by hand.
-- Agents and automated tooling must NOT apply it to any database.
--
-- Pin search_path on the two helper functions created in 001_enhanced_schema.sql
-- (Supabase linter: function_search_path_mutable). Neither is SECURITY DEFINER,
-- so this is hardening only. Both bodies reference nothing but pg_catalog
-- built-ins (NOW, jsonb_typeof, jsonb_array_elements, the jsonb ? operator),
-- which resolve without any schema on the path, hence an empty search_path.
-- Historical migrations are intentionally left untouched.
-- ALTER FUNCTION ... SET is idempotent and safe to re-run.

ALTER FUNCTION calendar_aggregator.update_updated_at_column()
  SET search_path = '';

ALTER FUNCTION calendar_aggregator.validate_calendar_sources(JSONB)
  SET search_path = '';
