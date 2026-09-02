# Storage and Supabase

Read this before changing anything in `src/lib/supabase.ts`, adding a migration, or debugging a missing collection.

## Layout

- Primary store: Supabase table `calendar_aggregator.collections`. The schema is custom, not `public`.
- Every query chains `.schema('calendar_aggregator')`; the table accessor in `supabase.ts` does this once, so use it rather than building new clients.
- The app uses the **anon key**. RLS is on, so any new table needs an explicit anon policy or writes fail silently (see `migrations/003_fix_rls_anon_policy.sql`).
- Migrations are plain SQL under `migrations/`, applied by hand. `004_add_management_token.sql` is the latest.

## Error contract

DB failures are **not** masked. Each CRUD function catches errors and:

1. If Supabase env vars are missing (`isNotConfiguredError`, `src/lib/supabase.ts:32`), falls back to the in-memory store in `src/lib/utils.ts`. This is the local-dev and test path.
2. Otherwise logs a greppable `[db] <op> failed:` line and throws `DatabaseOperationError` (`src/lib/errors.ts:56`), which route handlers turn into HTTP 503.

So on Vercel a 404 means the row genuinely was not found. A 503 means the query failed. When debugging, grep Vercel logs for `[db]`.

The in-memory store lives on `globalThis.calendarCollections` and is empty on every cold start, so it is never a production fallback.

## Row shape

`mapRow` in `src/lib/supabase.ts` (just above `saveCollectionToDatabase` at `:216`) maps a row to `CalendarCollection`. It keeps `managementToken` server-side; routes strip it with `stripManagementToken` (`src/lib/collection-service.ts:126`) before responding.

## Querying the remote DB without Docker

`supabase db dump` and `supabase db execute` need Docker, which is not available in this WSL2 setup. Use the Management API instead:

```
POST https://api.supabase.com/v1/projects/ogdfhmnnhlmqwuhlikem/database/query
Authorization: Bearer <management_key>
Content-Type: application/json
{"query": "select guid, name from calendar_aggregator.collections"}
```

The management key is in `.env.local` as `NEXT_PUBLIC_SUPABASE_MANAGEMENT_KEY`. The PostgREST endpoint needs `Accept-Profile: calendar_aggregator` (reads) or `Content-Profile: calendar_aggregator` (writes) for the custom schema.

## Environment variables

| Variable                        | Used by                                    |
| ------------------------------- | ------------------------------------------ |
| `NEXT_PUBLIC_SUPABASE_URL`      | `getSupabaseEnv`, `src/lib/supabase.ts:91` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | same                                       |
| `RATE_LIMIT_CREATE_PER_MIN`     | `src/lib/rate-limit.ts:140` (default 10)   |
| `RATE_LIMIT_FEED_PER_MIN`       | `src/lib/rate-limit.ts:146` (default 60)   |
| `GA_API_SECRET`                 | `src/lib/analytics.ts:16` (optional)       |

Worktrees under `.claude/worktrees/` do not carry `.env.local`, so a dev server started there runs in-memory.
