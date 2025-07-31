# Calendar Aggregator

A powerful GUID-based calendar aggregation API that combines multiple iCal feeds into unified calendar collections. Built with Next.js 15, TypeScript, and modern serverless architecture featuring a beautiful glassmorphism UI.

## ✨ Modern Web Interface

Experience the **stunning glassmorphism design** with:

- 🎨 **Glass-effect panels** with backdrop blur and transparency
- 🌊 **Animated gradient blobs** creating a dynamic background
- 💫 **Smooth hover animations** and visual effects
- 🌓 **Dark/light mode support** with automatic theme detection
- 📱 **Responsive design** optimized for all devices
- ⚡ **Interactive elements** with gradient accents and shadows

## 📅 What It Does

The Calendar Aggregator allows you to:

- **Create calendar collections** with unique GUIDs for secure access
- **Real-time calendar aggregation** without persistent storage
- **Combine multiple calendars** from different sources (Google Calendar, Outlook, Apple Calendar, etc.)
- **Validate and test** calendar URLs before adding them
- **Direct iCal feed output** compatible with all calendar applications
- **Concurrent fetching** with error handling and timeout protection
- **Beautiful web interface** for easy collection management

## 🌐 Live Demo

**Production URL**: https://calendar-aggregator-jnmxvdzgo-melbourne-computing.vercel.app/

✨ **Visit the web interface** to experience the modern glassmorphism design and follow the interactive guides for creating your first calendar collection.

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

### Collection Management (GUID-Based)

#### GET /api/collections

List all calendar collections

```json
{
  "collections": [
    {
      "guid": "4fac5413-98b8-45d1-a8b3-1c26feda1941",
      "name": "Work & Personal",
      "description": "Combined work and personal calendars",
      "calendars": [
        {
          "id": 1,
          "name": "Work Calendar",
          "url": "https://calendar.google.com/calendar/ical/work@example.com/public/basic.ics",
          "color": "#3b82f6",
          "enabled": true,
          "syncStatus": "idle"
        }
      ],
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "count": 1
}
```

#### POST /api/collections

Create a new calendar collection

```bash
curl -X POST https://calendar-aggregator-jnmxvdzgo-melbourne-computing.vercel.app/api/collections \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Combined Calendar",
    "description": "Work and personal events together",
    "calendars": [
      {
        "name": "Work Calendar",
        "url": "https://calendar.google.com/calendar/ical/work@example.com/public/basic.ics",
        "color": "#3b82f6",
        "enabled": true
      },
      {
        "name": "Personal Calendar",
        "url": "webcal://outlook.live.com/owa/calendar/xyz/reachcalendar.ics",
        "color": "#ef4444",
        "enabled": true
      }
    ]
  }'
```

**Response**: Returns the created collection with a unique GUID

#### GET /api/collections/{guid}

Get a specific collection by GUID

#### PUT /api/collections/{guid}

Update a collection (name, description, or calendars)

#### DELETE /api/collections/{guid}

Remove a collection

### Calendar Feed Access

#### GET /api/calendar/{guid}

**Main endpoint** - Get the aggregated iCal feed for subscription

```bash
# Direct access to combined calendar feed
curl https://calendar-aggregator-jnmxvdzgo-melbourne-computing.vercel.app/api/calendar/4fac5413-98b8-45d1-a8b3-1c26feda1941
```

**Response**: Returns a complete iCal (.ics) file with all events from the collection's calendars

**Headers**:

- `Content-Type: text/calendar; charset=utf-8`
- `Content-Disposition: attachment; filename="collection-name.ics"`
- `Cache-Control: public, max-age=300`

#### HEAD /api/calendar/{guid}

Check feed availability without downloading content

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

## 🚀 Quick Start Example

### 1. Create a Collection

```bash
curl -X POST https://calendar-aggregator-jnmxvdzgo-melbourne-computing.vercel.app/api/collections \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Calendars",
    "calendars": [
      {
        "name": "Google Calendar",
        "url": "https://calendar.google.com/calendar/ical/your-email@gmail.com/public/basic.ics",
        "color": "#4285f4"
      }
    ]
  }'
```

### 2. Get Your GUID

The response includes a unique GUID:

```json
{
  "guid": "abc123-def456-ghi789",
  "name": "My Calendars",
  ...
}
```

### 3. Subscribe in Your Calendar App

Use this URL in Google Calendar, Apple Calendar, or Outlook:

```
https://calendar-aggregator-jnmxvdzgo-melbourne-computing.vercel.app/api/calendar/abc123-def456-ghi789
```

## 🛠️ Technology Stack

This calendar aggregator is built with:

- **[Next.js 15](https://nextjs.org/)** - React framework with App Router and serverless functions
- **[TypeScript](https://www.typescriptlang.org/)** - Type safety and better developer experience
- **[node-ical](https://www.npmjs.com/package/node-ical)** - iCal parsing and processing
- **Real-time aggregation** - No database required, fetches calendars on-demand
- **GUID-based collections** - Secure access with cryptographically secure identifiers

## 📁 Project Structure

```
src/
├── app/
│   └── api/                    # API endpoints
│       ├── collections/        # Collection CRUD operations
│       │   └── [guid]/         # Individual collection management
│       ├── calendar/[guid]/    # Main calendar feed endpoint
│       └── health/             # Health check endpoint
├── lib/
│   ├── calendar-utils.ts       # URL validation and connection testing
│   ├── calendar-fetcher.ts     # iCal fetching and parsing
│   └── ical-combiner.ts        # Real-time iCal combination utility
└── types/
    └── calendar.ts             # TypeScript interfaces for collections and calendars
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

## ✨ Key Features

- **🎨 Modern Glassmorphism UI**: Beautiful web interface with glass effects and animations
- **🔒 GUID-based Security**: Each collection has a unique, unguessable identifier
- **⚡ Real-time Aggregation**: No database needed - fetches calendars on demand
- **🌐 Universal Compatibility**: Works with Google Calendar, Outlook, Apple Calendar, and more
- **🔄 Event Deduplication**: Automatically handles duplicate events by UID
- **🕒 Timezone Preservation**: Maintains original timezone information
- **⏱️ Timeout Protection**: Concurrent fetching with configurable timeouts
- **📱 Mobile Ready**: Compatible with all calendar applications
- **🌓 Dark Mode Support**: Automatic theme detection and switching
- **💫 Interactive Elements**: Hover effects, gradient accents, and smooth transitions

## ⚠️ Architecture Notes

This is a **serverless, stateless** implementation:

- **In-memory collections**: Collection data persists during serverless function lifetime
- **No authentication**: API endpoints are publicly accessible (secured by GUID)
- **Real-time fetching**: Events are fetched on-demand, not cached
- **Timeout protection**: 15-second timeout per calendar source
- **Error resilience**: Failed calendars don't break the entire feed

## 🚀 Deployment

**Already deployed!** The production version is live at:
https://calendar-aggregator-jnmxvdzgo-melbourne-computing.vercel.app/

### Deploy Your Own

1. Fork this repository
2. Connect to Vercel
3. Deploy with default settings
4. Your API will be available at `your-domain.vercel.app/api`

### Local Development

```bash
git clone https://github.com/seansoreilly/calendar-aggregator
cd calendar-aggregator
npm install
npm run dev
```

## 📄 License

MIT License - feel free to use this for personal or commercial projects.

---

**Calendar Aggregator** - GUID-based calendar collection and aggregation service

_Created by [balddata.xyz](https://balddata.xyz) ([sean@balddata.xyz](mailto:sean@balddata.xyz))_
