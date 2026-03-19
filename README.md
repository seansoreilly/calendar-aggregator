# Calendar Aggregator

Combine multiple iCal calendar feeds into a single subscription URL. Works with Google Calendar, Outlook, iCloud, and any public `.ics` feed.

**Live:** https://www.calendar-aggregator.online

## How it works

1. Paste your iCal feed URLs into the form
2. Give the collection a name (and optionally a custom ID)
3. Subscribe to the generated URL in any calendar app

When your calendar app fetches the feed, events are pulled from all sources in real time, deduplicated by UID, and returned as a single `.ics` file. Nothing is cached — only the collection metadata (name, source URLs) is stored.

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

### Get the combined feed

```
GET /api/calendar/{guid}
```

Returns `text/calendar`. Subscribe to this URL in any calendar app.

Optional: `?timeout=5000` (milliseconds, 1000–30000, default 15000)

### Other endpoints

| Method   | Path                      | Description                           |
| -------- | ------------------------- | ------------------------------------- |
| `GET`    | `/api/collections/{guid}` | Get a collection                      |
| `PUT`    | `/api/collections/{guid}` | Update a collection                   |
| `DELETE` | `/api/collections/{guid}` | Delete a collection                   |
| `HEAD`   | `/api/calendar/{guid}`    | Check feed exists without downloading |
| `GET`    | `/api/health`             | Service health check                  |

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
```

Without Supabase configured, collections fall back to in-memory storage (lost on restart).

## Tech stack

- [Next.js 15](https://nextjs.org) — App Router, serverless API routes
- [Supabase](https://supabase.com) — Postgres (custom schema `calendar_aggregator`)
- [Tailwind CSS](https://tailwindcss.com) — styling
- [Vitest](https://vitest.dev) — tests

## Privacy

Calendar event data is never stored. See the [Privacy Policy](https://www.calendar-aggregator.online/privacy) for details.

## License

MIT
