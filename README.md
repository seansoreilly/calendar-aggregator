# Calendar Aggregator

A powerful calendar aggregation API that combines multiple iCal feeds into a unified calendar service. Built with Next.js 15, TypeScript, and modern web technologies.

## 📅 What It Does

The Calendar Aggregator allows you to:

- **Combine multiple calendars** from different sources (Google Calendar, Outlook, Apple Calendar, etc.)
- **Validate and test** calendar URLs before adding them
- **Fetch events** from multiple calendars concurrently
- **Output unified feeds** in JSON or iCal format
- **Monitor sync status** and handle errors gracefully

## 🤖 Built for Claude Code

This project is **optimized for AI-powered development**. If you're not already using Claude Code, here's how to get started:

### 📋 Setup Checklist

- [ ] **VS Code installed** → [Download here](https://code.visualstudio.com/)
- [ ] **Claude Code extension** → [Install from VS Code marketplace](https://marketplace.visualstudio.com/items?itemName=Anthropic.claude-dev)
- [ ] **Project opened in VS Code** → Run `code .` in your terminal

## 🚀 Getting Started

### 1. Install Dependencies

```bash
cd calendar-aggregator
npm install
```

### 2. Start Development Server

```bash
npm run dev
```

### 3. Access the API

The calendar aggregation API will be available at [http://localhost:3000/api](http://localhost:3000/api)

## 📚 API Documentation

### Calendar Management

#### GET /api/calendars

List all configured calendars

```json
{
  "calendars": [
    {
      "id": 1,
      "name": "Work Calendar",
      "url": "https://calendar.google.com/calendar/ical/work@example.com/public/basic.ics",
      "color": "#3b82f6",
      "enabled": true,
      "syncStatus": "success",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "lastSyncAt": "2024-01-01T12:00:00.000Z"
    }
  ],
  "count": 1
}
```

#### POST /api/calendars

Add a new calendar source

```bash
curl -X POST http://localhost:3000/api/calendars \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Personal Calendar",
    "url": "webcal://calendar.google.com/calendar/ical/personal@example.com/public/basic.ics",
    "color": "#ef4444"
  }'
```

#### GET /api/calendars/{id}

Get a specific calendar

#### PUT /api/calendars/{id}

Update a calendar

```bash
curl -X PUT http://localhost:3000/api/calendars/1 \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Work Calendar",
    "enabled": false
  }'
```

#### DELETE /api/calendars/{id}

Remove a calendar

### Calendar Synchronization

#### POST /api/sync

Sync calendar events from all enabled sources

```bash
curl -X POST http://localhost:3000/api/sync \
  -H "Content-Type: application/json" \
  -d '{
    "calendarIds": [1, 2]
  }'
```

Response:

```json
{
  "status": "completed",
  "startedAt": "2024-01-01T12:00:00.000Z",
  "completedAt": "2024-01-01T12:00:05.000Z",
  "calendars": 2,
  "eventsProcessed": 25,
  "errors": [],
  "calendarResults": [
    {
      "calendarId": 1,
      "status": "completed",
      "eventsProcessed": 15,
      "errors": []
    }
  ]
}
```

#### GET /api/sync

Check sync status

```json
{
  "status": "idle",
  "lastSync": "2024-01-01T12:00:00.000Z",
  "totalCalendars": 3,
  "enabledCalendars": 2,
  "calendars": [
    {
      "calendarId": 1,
      "name": "Work Calendar",
      "syncStatus": "success",
      "lastSyncAt": "2024-01-01T12:00:00.000Z"
    }
  ]
}
```

## 📝 Supported Calendar Formats

The API accepts iCal (`.ics`) calendar URLs from:

- **Google Calendar**: Public calendar links
- **Outlook/Office 365**: Shared calendar URLs
- **Apple iCloud**: Public calendar shares
- **CalDAV servers**: Any standard iCal feed
- **Custom iCal files**: Hosted `.ics` files

### URL Format Examples

```
https://calendar.google.com/calendar/ical/[email]/public/basic.ics
webcal://outlook.live.com/owa/calendar/[id]/calendar.ics
https://caldav.icloud.com/published/2/[token]
```

**Note**: `webcal://` URLs are automatically converted to `https://`

## 🛠️ Technology Stack

This calendar aggregator is built with:

- **[Next.js 15](https://nextjs.org/)** - React framework with App Router for API endpoints
- **[TypeScript](https://www.typescriptlang.org/)** - Type safety and better developer experience
- **[node-ical](https://www.npmjs.com/package/node-ical)** - iCal parsing and processing
- **[Axios](https://axios-http.com/)** - HTTP client for fetching calendar feeds
- **[date-fns](https://date-fns.org/)** - Date manipulation utilities

## 📁 Project Structure

```
src/
├── app/
│   └── api/            # API endpoints
│       ├── calendars/  # Calendar CRUD operations
│       ├── sync/       # Calendar synchronization
│       └── health/     # Health check endpoint
├── lib/
│   ├── calendar-utils.ts    # URL validation and connection testing
│   └── calendar-fetcher.ts  # iCal fetching and parsing
└── types/
    └── calendar.ts     # TypeScript interfaces for calendar data
```

## 🧪 Testing & Development

```bash
npm run dev         # Start development server
npm run build       # Build for production
npm run lint        # Check code quality
npm run type-check  # TypeScript validation
```

### Testing Calendar URLs

You can test calendar URL validation using the API:

```bash
# Test if a calendar URL is valid and accessible
curl -X POST http://localhost:3000/api/calendars \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Calendar",
    "url": "https://calendar.google.com/calendar/ical/your-email@gmail.com/public/basic.ics"
  }'
```

The API will validate the URL format, test connectivity, and verify iCal data before creating the calendar entry.

## ⚠️ Current Limitations

This is a development version with the following limitations:

- **In-memory storage**: Calendars and sync data are stored in memory and will be lost on server restart
- **No authentication**: API endpoints are publicly accessible
- **No rate limiting**: No protection against API abuse
- **No persistent events**: Events are fetched on-demand, not stored
- **Basic error handling**: Limited retry logic and error recovery

## 🔧 Future Enhancements

Potential improvements for production use:

- Database integration (PostgreSQL, MongoDB)
- User authentication and authorization
- Event caching and incremental sync
- Webhook support for real-time updates
- Rate limiting and API security
- Event deduplication and conflict resolution
- Custom recurring event rules
- Export to multiple formats (iCal, JSON, CSV)

## 🚀 Deployment

### Vercel (Recommended)

1. Push your code to a Git repository
2. Connect your repository to Vercel
3. Deploy with default settings

### Manual Deployment

```bash
npm run build
npm start
```

## 📄 License

MIT License - feel free to use this for personal or commercial projects.

---

**Calendar Aggregator** - Combine multiple iCal feeds into a unified API
