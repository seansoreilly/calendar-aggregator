# Architecture

Routes, library modules, and the two request flows. Read this before touching anything under `src/app/api` or `src/lib`.

## API routes

| Route                                    | Handler                                   | Notes                                                                  |
| ---------------------------------------- | ----------------------------------------- | ---------------------------------------------------------------------- |
| `POST /api/collections`                  | `src/app/api/collections/route.ts:27`     | Create. No GET is exported, so listing returns 405. Rate limited.      |
| `GET/PUT/DELETE /api/collections/[guid]` | `src/app/api/collections/[guid]/route.ts` | GET at `:29`, PUT at `:64`, DELETE at `:137`. PUT/DELETE need a token. |
| `GET/HEAD /api/calendar/[guid]`          | `src/app/api/calendar/[guid]/route.ts`    | The iCal feed. GET at `:40`, HEAD at `:198`. Rate limited, ETag/304.   |
| `GET /api/health`                        | `src/app/api/health/route.ts:5`           | Reports Supabase connection status via `getSupabaseHealth`.            |

Feed query params: `timeout` (`parseCalendarTimeout`, `src/lib/calendar-response.ts:64`) and the date window `start`/`end` (`YYYY-MM-DD`) or `past`/`future` (`<n>d|w|m|y`) (`parseCalendarDateRange`, `src/lib/calendar-response.ts:163`). See [ical-processing.md](ical-processing.md) for how the window is applied.

## Library modules (`src/lib/`)

| File                    | Purpose                                                                                                                     |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `supabase.ts`           | DB CRUD (`:216` save, `:251` list, `:273` find, `:298` update, `:337` delete), health (`:151`), guid filter (`:78`)         |
| `ical-combiner.ts`      | `combineICalFeeds` (`:379`) is the only export. Text-level merge of source calendars.                                       |
| `calendar-fetch.ts`     | `fetchCalendarBody` (`:104`): the single size-capped, timeout-bound fetch path for every source calendar                    |
| `safe-fetch.ts`         | SSRF-hardened `fetch` wrapper (`:59`): textual guard, DNS-rebinding guard, redirect re-validation                           |
| `collection-service.ts` | POST logic: `processCalendarInputs` (`:57`), `buildCollectionRecord` (`:93`), `generateGuid` (`:133`), token helpers        |
| `collection-auth.ts`    | `extractBearerToken` (`:21`), `authorizeMutation` (`:51`). See [management-tokens.md](management-tokens.md)                 |
| `calendar-response.ts`  | iCal response builders (`:207` success, `:223` partial, `:249` 304, `:259` HEAD), `computeICalETag` (`:17`), param parsers  |
| `calendar-utils.ts`     | `normalizeCalendarUrl` (`:19`), `buildCalendarSource` (`:26`), `validateCalendarUrl` (`:97`)                                |
| `validation.ts`         | `UUID_REGEX` (`:12`), id/name/description validators, SSRF checks (`:219`, `:239`), request validators (`:291`, `:345`)     |
| `rate-limit.ts`         | `RateLimiter` (`:40`) plus the two shared limiters (`:140` create, `:146` feed)                                             |
| `errors.ts`             | Error hierarchy (`:8` base, `:27` not-found, `:39` validation, `:49` unauthorized, `:56` database), `errorResponse` (`:94`) |
| `analytics.ts`          | Server-side GA Measurement Protocol `trackEvent` (`:16`); needs `GA_API_SECRET`                                             |
| `gtag.ts`               | Client-side GA `trackEvent` wrapper around `window.gtag`                                                                    |
| `utils.ts`              | `cn()` (`:6`) and the in-memory store helpers on `globalThis.calendarCollections` (`:26` onward)                            |

## Data flow

**Create a collection.** `POST /api/collections` runs the create rate limiter, then `validateCreateCollectionRequest`, `processCalendarInputs` (which calls `validateCalendarUrl` per source), `buildCollectionRecord`, and `saveCollectionToDatabase`. The response is the only place the management token is ever returned.

**Serve a feed.** `GET /api/calendar/[guid]` runs the feed rate limiter, parses the timeout and date window, loads the collection with `findCollectionByGuidInDatabase`, calls `combineICalFeeds`, computes the ETag, and returns 304, 200, or 206 (partial) via the builders in `calendar-response.ts`.

## Collection ID (guid) rules

`guid` is either a UUID (exact match) or a custom slug such as `seansoreilly` (case-insensitive: `ilike` in the DB via `applyGuidFilter` at `src/lib/supabase.ts:78`, lowercased comparison in memory at `src/lib/utils.ts:19`). `UUID_REGEX` at `src/lib/validation.ts:12` is the single detection pattern; do not add another. `UBIQUITOUS_LANGUAGE.md` at the repo root defines the preferred terms (Collection, Calendar Source, Combined Feed, Partial Feed, Custom ID).

## Security headers

All headers live in `next.config.ts:9` under the source pattern `/(.*)`, which covers `/api/*` too. There is no `src/middleware.ts`; it was removed because it duplicated these headers with a looser CSP. The CSP at `next.config.ts:39` allows Google Tag Manager in `script-src` and the Google Analytics collectors in `connect-src`. `src/__tests__/security-headers.test.ts` pins the values.

## Google Analytics

The measurement id is hardcoded at `src/components/google-analytics.tsx:16` and injected from `src/app/layout.tsx`. The `window.gtag` type lives in the same component. Client events fire from `src/components/create-collection-form.tsx` through `src/lib/gtag.ts`: `collection_created`, `collection_creation_failed`, `collection_deleted`, `feed_url_copied`. Server-side events go through `src/lib/analytics.ts` and are skipped when `GA_API_SECRET` is unset.
