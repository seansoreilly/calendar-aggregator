# Calendar Aggregator

Combine multiple iCal calendar feeds into a single subscription URL. Works with Google Calendar, Outlook, iCloud, and any public `.ics` feed.

**Live:** https://www.calendar-aggregator.online

## How it works

1. Paste your iCal feed URLs into the form
2. Give the collection a name (and optionally a custom ID)
3. Save the management token shown after creation
4. Subscribe to the generated URL in any calendar app

When your calendar app fetches the feed, events are pulled from all sources in real time, deduplicated by UID, and returned as a single `.ics` file. Nothing is cached — only the collection metadata (name, source URLs) is stored.

Collections can be edited later at `/manage/{guid}` using the management token.

## API

### Create a collection

```bash
curl -X POST https://www.calendar-aggregator.online/api/collections \
  -H "Content-Type: application/json" \
  -d '{
    "name": "All Calendars",
    "customId": "my-cals",
    "calendars": [
      { "url": "https://...", "name": "Work" },
      { "url": "webcal://...", "name": "Personal" }
    ]
  }'
```

`customId` is optional — omit it to get an auto-generated UUID. `webcal://` URLs are converted to `https://` automatically.

The response includes a `managementToken`. **It is returned only once** — save it. It is required to update or delete the collection and is never included in any later response.

### Get the combined feed

```
GET /api/calendar/{guid}
```

Returns `text/calendar`. Subscribe to this URL in any calendar app.

- Optional `?timeout=5000` (milliseconds, 1000–30000, default 15000)
- Responses carry a strong `ETag`; conditional requests with `If-None-Match` get `304 Not Modified`
- If some source calendars fail, the feed is still served from the working sources with status `206 Partial Content`

### Update or delete a collection

```bash
curl -X PUT https://www.calendar-aggregator.online/api/collections/{guid} \
  -H "Authorization: Bearer <managementToken>" \
  -H "Content-Type: application/json" \
  -d '{ "name": "New Name" }'
```

`PUT` and `DELETE` require the collection's management token as a bearer token. Collections created before tokens were introduced can still be modified without one. A web UI for editing lives at `/manage/{guid}`.

### Other endpoints

| Method   | Path                      | Description                           |
| -------- | ------------------------- | ------------------------------------- |
| `GET`    | `/api/collections/{guid}` | Get a collection                      |
| `DELETE` | `/api/collections/{guid}` | Delete a collection (requires token)  |
| `HEAD`   | `/api/calendar/{guid}`    | Check feed exists without downloading |
| `GET`    | `/api/health`             | Service health check                  |

### Rate limits

Requests are rate limited per IP (best-effort, in-memory per serverless instance): 10 collection creates/min and 60 feed reads/min by default. Denied requests receive `429` with a `Retry-After` header.

## Development

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # run tests
npm run type-check # TypeScript validation
npm run lint       # lint
```

### Environment variables

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...

# Optional overrides
RATE_LIMIT_CREATE_PER_MIN=10
RATE_LIMIT_FEED_PER_MIN=60
```

Without Supabase configured, collections fall back to in-memory storage (lost on restart).

### Database

Schema migrations live in `migrations/` and are applied manually to the Supabase project. Data lives in the custom schema `calendar_aggregator` (not `public`); RLS is enabled, so new tables need explicit anon policies.

## Tech stack

- [Next.js 15](https://nextjs.org) — App Router, serverless API routes
- [Supabase](https://supabase.com) — Postgres (custom schema `calendar_aggregator`)
- [Tailwind CSS](https://tailwindcss.com) — styling
- [Vitest](https://vitest.dev) — tests

## Privacy

Calendar event data is never stored. See the [Privacy Policy](https://www.calendar-aggregator.online/privacy) for details.

## License

MIT
