-- Migration 004: Add management token for collection ownership
-- File: migrations/004_add_management_token.sql
-- Purpose: Give each collection an opaque management token that authorizes
--          mutations (PUT/DELETE). The column is nullable: legacy rows created
--          before this migration have no token and remain mutable without one
--          (backward compatibility — enforced in the API layer).
--
-- No new RLS policy is needed: the existing "Allow anon full access" policy
-- (migration 003) already covers all columns on this table for the anon role.

ALTER TABLE calendar_aggregator.collections
  ADD COLUMN IF NOT EXISTS management_token text;

COMMENT ON COLUMN calendar_aggregator.collections.management_token IS
  'Opaque bearer token authorizing mutations (PUT/DELETE) on this collection. '
  'Nullable: legacy rows have none and are mutable without a token. '
  'Never returned in GET responses — only in the initial creation response.';
