# Management tokens and rate limiting

Read this before touching PUT/DELETE on collections, the manage UI, or the limiters.

## Tokens

- Column `management_token` (text, nullable) on `collections`, added by `migrations/004_add_management_token.sql`.
- Generated at create time by `generateManagementToken` (`src/lib/collection-service.ts:89`) and stored via `buildCollectionRecord`.
- Returned **once**, in the `POST /api/collections` response. GET responses strip it with `stripManagementToken` (`src/lib/collection-service.ts:126`).
- PUT and DELETE on `/api/collections/[guid]` call `authorizeMutation` (`src/lib/collection-auth.ts:51`) with the `Authorization: Bearer <token>` header. Comparison is constant-time.
- **Legacy rows** with a null token (created before migration 004, or via the in-memory path) stay mutable without a header. `authorizeMutation` lets them through deliberately; the `seansoreilly` collection is one of these until a token is backfilled.
- Failures raise `UnauthorizedError` (`src/lib/errors.ts:49`), which becomes HTTP 401.

## Manage UI

`src/app/manage/[guid]/page.tsx` renders `src/components/manage-collection-form.tsx`. The form caches the token in `localStorage` under the key built at `manage-collection-form.tsx:46` (`calendar-aggregator:token:<guid>`); the create form writes the same key at `create-collection-form.tsx:18` right after creation.

## Rate limiting

`src/lib/rate-limit.ts` is a best-effort in-memory sliding window keyed by client IP (`clientKeyFromHeaders`, `:94`). It only counts requests that hit the same warm instance, so treat it as abuse damping, not a guarantee. Two shared limiters:

| Limiter                   | Route                      | Default       | Env override                |
| ------------------------- | -------------------------- | ------------- | --------------------------- |
| `collectionCreateLimiter` | `POST /api/collections`    | 10 per minute | `RATE_LIMIT_CREATE_PER_MIN` |
| `calendarFeedLimiter`     | `GET /api/calendar/[guid]` | 60 per minute | `RATE_LIMIT_FEED_PER_MIN`   |

`rateLimitResponse` (`:111`) returns 429 with `Retry-After`. Tests: `src/__tests__/rate-limit.test.ts` and `src/__tests__/integration/collection-auth.test.ts`.
