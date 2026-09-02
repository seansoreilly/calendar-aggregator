---
name: feed-check
description: Smoke-test a calendar collection's combined iCal feed (HEAD, GET, ETag/304, header and body sanity) against a local dev server or production. Use when the user asks to check, verify, or debug a feed URL, an /api/calendar/<guid> endpoint, a collection's .ics output, partial (206) feeds, or ETag/304 caching behaviour.
---

# Feed Check

Verifies that `GET /api/calendar/<guid>` behaves the way calendar clients expect.
Read-only: it never creates or mutates collections.

## Quick start

```bash
# Local dev server (default base URL is http://localhost:3000)
node .claude/skills/feed-check/scripts/check-feed.mjs seansoreilly

# Production
node .claude/skills/feed-check/scripts/check-feed.mjs seansoreilly --base https://www.calendar-aggregator.online

# Pass feed query params through (date window, timeout)
node .claude/skills/feed-check/scripts/check-feed.mjs <guid> --query "past=2w&future=3m"
```

Exit code is 0 when every check passes, 1 otherwise. Output is one line per check plus a
summary, so it is safe to run repeatedly and easy to grep.

## What it checks

1. `HEAD` returns 200 with `text/calendar` and the `X-Calendar-*` metadata headers.
2. `GET` returns 200 (all sources OK) or 206 (partial, some sources failed). 206 is reported
   as a warning, not a failure, and the `X-Calendar-Warnings` header is printed.
3. Body starts with `BEGIN:VCALENDAR` and ends with `END:VCALENDAR`.
4. `VEVENT` block count in the body matches the `X-Calendar-Events-Count` header.
5. A second `GET` with `If-None-Match: <etag>` returns 304 with an empty body.

## Workflow

1. Confirm which environment the user means. Local needs `npm run dev` running; a worktree
   without `.env.local` serves in-memory collections only, so a production guid will 404 there.
2. Run the script. Restate the summary line and any failing check in your reply.
3. Map failures to code, not guesses:
   - 404 → collection lookup; see `src/lib/supabase.ts` and the RLS notes in `CLAUDE.md`.
   - 503 → every source failed; see `combineICalFeeds` in `src/lib/ical-combiner.ts`.
   - 206 → inspect `X-Calendar-Warnings` for the failing source URL.
   - Event-count mismatch or missing `END:VCALENDAR` → assembly in `src/lib/ical-combiner.ts`.
   - No 304 → ETag handling in `src/app/api/calendar/[guid]/route.ts` and
     `computeICalETag` in `src/lib/calendar-response.ts`.
4. Do not save the feed body to a `.ics` file in the repo; that extension is gitignored on purpose.

## Notes

- Feed reads are rate limited per IP (see `src/lib/rate-limit.ts`). The script makes three
  requests per run, so avoid tight loops against production.
- `--timeout <ms>` maps to the feed's `timeout` query param (1000–30000).
