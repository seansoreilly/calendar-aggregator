# Testing

Vitest with jsdom, configured in `vitest.config.ts`. `src/__tests__/setup.ts` only loads jest-dom matchers. `@` aliases `src/`.

## Layout

```
src/__tests__/
├── example.test.tsx              # HomePage smoke test
├── utils.test.ts                 # cn()
├── validation.test.ts            # validators, UUID_REGEX, SSRF checks
├── calendar-utils.test.ts        # URL normalisation and validateCalendarUrl
├── calendar-response.test.ts     # ETag, timeout and date-range parsers, response builders
├── collection-service.test.ts    # processCalendarInputs / buildCollectionRecord (mocks calendar-utils)
├── ical-combiner.test.ts         # combineICalFeeds (stubs globalThis.fetch)
├── safe-fetch.test.ts            # SSRF guard and redirect handling
├── rate-limit.test.ts            # RateLimiter windows
├── security-headers.test.ts      # next.config.ts headers()
├── supabase-helpers.test.ts      # escapeLikePattern / applyGuidFilter
└── integration/
    ├── collections.test.ts           # POST /api/collections
    ├── collections-crud.test.ts      # PUT/DELETE /api/collections/[guid]
    ├── collection-auth.test.ts       # bearer token enforcement + rate limiting
    ├── custom-ids.test.ts            # custom ID validation and collision
    ├── calendar-feed.test.ts         # GET/HEAD /api/calendar/[guid] (mocks supabase + ical-combiner)
    └── supabase-guid-types.test.ts   # live DB; skipped without Supabase env vars
```

## Conventions

- Integration tests run **without** Supabase env vars, so the DB layer takes the in-memory path described in [storage-supabase.md](storage-supabase.md). Only `calendar-feed.test.ts` mocks `../../lib/supabase` directly.
- Route tests mock `../../lib/calendar-utils` to replace `validateCalendarUrl`, so no network calls happen. Copy the `vi.mock` block from `integration/collections.test.ts:8` when adding a new route test.
- `safe-fetch.ts` skips its DNS guard under `NODE_ENV=test`; fetch mocks on `globalThis.fetch` are honoured because it always calls the global.
- The Husky pre-commit hook (`.husky/pre-commit`) bumps the patch version in `package.json` on every commit, so parallel branches conflict on that line. Resolve by taking either side and re-running `npm install --package-lock-only` if the lockfile disagrees.
