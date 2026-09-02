# iCal processing

Read this before changing `src/lib/ical-combiner.ts`, `src/lib/calendar-fetch.ts`, or the feed route.

## Fetching sources

Every source goes through `fetchCalendarBody` (`src/lib/calendar-fetch.ts:104`), which wraps `safeFetch` (`src/lib/safe-fetch.ts:59`). It enforces a per-source byte cap (`DEFAULT_MAX_SOURCE_BYTES`, `:16`, 25 MB), a per-request timeout (`DEFAULT_FETCH_TIMEOUT_MS`, `:19`, 15 s), and an iCal sanity check before returning the body. `safeFetch` rejects private and reserved addresses, re-resolves DNS to defeat rebinding (skipped under `NODE_ENV=test`), and re-validates every redirect hop. Do not call the global `fetch` for calendar URLs anywhere else.

## Combining

`combineICalFeeds` (`src/lib/ical-combiner.ts:379`) works on text, never on parsed objects:

1. Fetches all sources in parallel with `Promise.allSettled` (`:426`), so one failure does not sink the feed. Any rejection makes the result partial and the route returns HTTP 206.
2. Extracts `BEGIN:VEVENT`/`END:VEVENT` and `VTIMEZONE` blocks with `extractComponentBlocks` (`:38`).
3. Deduplicates events by UID, first occurrence wins (`deduplicateEvents`, `:109`), and timezones by TZID (`deduplicateTimezones`, `:323`).
4. Applies the optional date window with `filterEventsByDateRange` (`:288`) after dedup. Recurring series are kept whole (`recurringSeriesMayOverlap`, `:259`); TZID-qualified times are compared as UTC.
5. Truncates to `MAX_TOTAL_EVENTS` (`:9`, 50,000) with a console warning.
6. Assembles header, timezones, events, `END:VCALENDAR`.

## Response

The route computes `computeICalETag` (`src/lib/calendar-response.ts:17`) over the combined body and answers `If-None-Match` with 304. Sources are still fetched to derive the ETag; the 304 only saves bandwidth. `parseCalendarTimeout` (`:64`) and `parseCalendarDateRange` (`:163`) parse the query params documented in `README.md`.

## Tests

`src/__tests__/ical-combiner.test.ts` stubs `globalThis.fetch`. `src/__tests__/safe-fetch.test.ts` and `src/__tests__/calendar-response.test.ts` cover the fetch guard and the parsers.
