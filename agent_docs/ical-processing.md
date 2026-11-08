# iCal processing

Read this before changing `src/lib/ical-combiner.ts`, `src/lib/calendar-fetch.ts`, or the feed route.

## Fetching sources

Every source goes through `fetchCalendarBody` (`src/lib/calendar-fetch.ts:104`), which wraps `safeFetch` (`src/lib/safe-fetch.ts:59`). It enforces a per-source byte cap (`DEFAULT_MAX_SOURCE_BYTES`, `:16`, 25 MB), a per-request timeout (`DEFAULT_FETCH_TIMEOUT_MS`, `:19`, 15 s), and an iCal sanity check before returning the body. `safeFetch` rejects private and reserved IP literals (`src/lib/ip-ranges.ts`, numeric v4/v6 parsing incl. mapped, NAT64, 6to4, ULA, link-local, multicast, CGNAT, benchmarking), and outside tests sends requests through `pinnedRequest`, a `node:http(s)` transport whose `lookup` resolves the name, rejects it if any answer is private, and connects only to the validated addresses (no second resolution, so no DNS-rebinding window; lookup failure fails closed). Every redirect hop (max 5) is re-validated and re-pinned. Under `NODE_ENV=test` the global `fetch` is used instead. The transport does not honour `HTTP(S)_PROXY`. Do not call the global `fetch` for calendar URLs anywhere else.

## Combining

`combineICalFeeds` (`src/lib/ical-combiner.ts:379`) works on text, never on parsed objects:

1. Fetches sources with `mapSettledWithConcurrency` (`src/lib/concurrency.ts`, at most `SOURCE_FETCH_CONCURRENCY` = 5 at a time), so one failure does not sink the feed. A collection holds at most `MAX_SOURCES_PER_COLLECTION` = 25 sources (`validation.ts`, enforced on create and update; 400 otherwise); create-time source checks use the same concurrency cap. Any rejection makes the result partial and the route returns HTTP 206.
2. Extracts `BEGIN:VEVENT`/`END:VEVENT` and `VTIMEZONE` blocks with `extractComponentBlocks` (`:38`).
3. Deduplicates events by UID, first occurrence wins (`deduplicateEvents`, `:109`), and timezones by TZID (`deduplicateTimezones`, `:323`).
4. Applies the optional date window with `filterEventsByDateRange` (`:288`) after dedup. Recurring series are kept whole (`recurringSeriesMayOverlap`, `:259`); TZID-qualified times are compared as UTC.
5. Truncates to `MAX_TOTAL_EVENTS` (`:9`, 50,000) with a console warning.
6. Assembles header, timezones, events, `END:VCALENDAR`.

## Response

The route computes `computeICalETag` (`src/lib/calendar-response.ts:17`) over the combined body and answers `If-None-Match` with 304. Sources are still fetched to derive the ETag; the 304 only saves bandwidth. `parseCalendarTimeout` (`:64`) and `parseCalendarDateRange` (`:163`) parse the query params documented in `README.md`.

## Tests

`src/__tests__/ical-combiner.test.ts` stubs `globalThis.fetch`. `src/__tests__/safe-fetch.test.ts` (including the pinned lookup/transport against a local server), `src/__tests__/ip-ranges.test.ts`, `src/__tests__/concurrency.test.ts` and `src/__tests__/calendar-response.test.ts` cover the fetch guard and the parsers.
