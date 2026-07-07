# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
npm run dev          # Start development server (http://localhost:3000)
npm run build        # Build for production
npm run lint         # ESLint check
npm run lint:fix     # Auto-fix lint issues
npm run type-check   # TypeScript validation
npm run format       # Prettier format
npm test             # Run all tests
npm test -- src/__tests__/utils.test.ts        # Single test file
npm test -- src/__tests__/integration/        # Integration tests only
```

Pre-commit hooks run `eslint --fix` + `prettier --write` automatically via Husky/lint-staged.

## Architecture Overview

### API Routes

Only four routes exist:

```
GET/POST  /api/collections          # List all / create collection
GET/PUT/DELETE /api/collections/[guid]  # Individual collection management
GET/HEAD  /api/calendar/[guid]      # iCal feed for calendar apps (main endpoint)
GET       /api/health               # Health check
```

### Library Modules (`src/lib/`)

| File                    | Purpose                                                                                                                                                               |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `supabase.ts`           | DB CRUD — `saveCollectionToDatabase`, `findCollectionByGuidInDatabase`, `getAllCollectionsFromDatabase`, `updateCollectionInDatabase`, `deleteCollectionFromDatabase` |
| `ical-combiner.ts`      | Fetches source calendars and combines them into one iCal — `combineICalFeeds()` is the only export                                                                    |
| `collection-service.ts` | Extracted POST handler logic — `processCalendarInputs`, `buildCollectionRecord`, `generateGuid`                                                                       |
| `calendar-response.ts`  | iCal HTTP response builders — `createCalendarSuccessResponse`, `createCalendarPartialResponse`, `createCalendarHeadResponse`, `parseCalendarTimeout`                  |
| `calendar-utils.ts`     | URL normalisation (`normalizeCalendarUrl`), validation (`validateCalendarUrl`), and source construction (`buildCalendarSource`)                                       |
| `validation.ts`         | Input validation — `UUID_REGEX`, `validateId`, `validateCustomId`, `validateCreateCollectionRequest`, sanitizers                                                      |
| `errors.ts`             | Error class hierarchy — `CalendarCollectionError`, `CollectionNotFoundError`, `ValidationError`; use `isCalendarCollectionError()` to type-narrow                     |
| `utils.ts`              | `cn()` for Tailwind class merging; in-memory fallback storage (`globalThis.calendarCollections`)                                                                      |

### Data Flow

**Creating a collection:**
`POST /api/collections` → `validateCreateCollectionRequest` → `processCalendarInputs` (validates URLs, calls `validateCalendarUrl`) → `buildCollectionRecord` → `saveCollectionToDatabase`

**Serving a feed:**
`GET /api/calendar/[guid]` → `findCollectionByGuidInDatabase` → `combineICalFeeds` (fetches all source URLs in parallel, deduplicates events by UID, preserves timezones) → `createCalendarSuccessResponse`

### GUID / Custom ID System

`guid` accepts either a UUID (exact match) or a custom slug like `seansoreilly` (case-insensitive via `ilike` in DB, lowercased comparison in memory). `UUID_REGEX` in `validation.ts` is the single source of truth for the detection pattern — used by `utils.ts`, `supabase.ts`, and `validation.ts`.

### Storage

Supabase is the primary store (`calendar_aggregator.collections`, custom schema not public). All DB functions silently fall back to `globalThis.calendarCollections` on error. On Vercel serverless, in-memory is empty on every cold start — DB failures appear as 404s, not 500s. When debugging missing collections, verify the Supabase query is actually succeeding.

- App uses the **anon key**, not service_role
- RLS is enabled — new tables need explicit anon policies or writes silently fail
- All queries must chain `.schema('calendar_aggregator')`

### Security Headers

Set in `next.config.ts` `headers()` (single source of truth — `src/middleware.ts` was removed since it duplicated the same headers with a looser CSP). Source pattern `/(.*)` applies to **all routes, including `/api/*`**. CSP includes `googletagmanager.com` (script-src) and `google-analytics.com` / `analytics.google.com` / `region1.google-analytics.com` (connect-src) for GA.

### Google Analytics

`G-ESZWBFZV7F` is hardcoded in `src/components/google-analytics.tsx` (injected in `layout.tsx`). Custom events tracked from `create-collection-form.tsx`:

- `collection_created` — params: `calendar_count`, `has_custom_id`
- `collection_creation_failed` — param: `error`
- `feed_url_copied`

`window.gtag` type is declared in `google-analytics.tsx`.

### iCal Processing

`combineICalFeeds` operates at the text level (no object parsing). It extracts `BEGIN:VEVENT`/`END:VEVENT` blocks, deduplicates by UID (first occurrence wins), deduplicates timezones by TZID, then assembles: header → timezones → events → `END:VCALENDAR`. Uses `Promise.allSettled` so individual source failures don't break the whole feed; partial failures return HTTP 206.

### Supabase CLI Limitation

`supabase db dump` requires Docker — not available in WSL2 without Docker Desktop. Use the Management API instead:

```
POST https://api.supabase.com/v1/projects/ogdfhmnnhlmqwuhlikem/database/query
Authorization: Bearer <management_key>
```

REST API requires `Accept-Profile: calendar_aggregator` header for the custom schema.

## Test Structure

```
src/__tests__/
├── example.test.tsx           # HomePage component smoke tests
├── utils.test.ts              # cn() utility
├── ical-combiner.test.ts      # combineICalFeeds — mocks global fetch
└── integration/
    ├── collections.test.ts        # POST/GET route handlers
    ├── collections-crud.test.ts   # PUT/DELETE route handlers
    ├── custom-ids.test.ts         # Custom ID validation & collision
    ├── calendar-feed.test.ts      # GET/HEAD /api/calendar/[guid]
    └── supabase-guid-types.test.ts # Live DB tests (skipped without env vars)
```

Integration tests mock Supabase (fall through to in-memory) and mock `validateCalendarUrl`. The `ical-combiner` tests stub `globalThis.fetch`.
