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

**Production URL**: https://www.calendar-aggregator.online/

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

### 2. Environment Setup (Optional - Supabase)

For persistent calendar collection storage, set up Supabase:

```bash
# Copy the example environment file
cp .env.example .env.local

# Add your Supabase credentials to .env.local
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

**Note**: Without Supabase, the application uses in-memory storage (collections are lost on server restart).

### 3. Start Development Server

```bash
npm run dev
```

### 4. Access the API

The calendar aggregation API will be available at [http://localhost:3000/api](http://localhost:3000/api)

## 📚 API Documentation

### Collection Management (GUID-Based)

#### POST /api/collections

Create a new calendar collection

```bash
curl -X POST https://www.calendar-aggregator.online/api/collections \
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
curl https://www.calendar-aggregator.online/api/calendar/4fac5413-98b8-45d1-a8b3-1c26feda1941
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
curl -X POST https://www.calendar-aggregator.online/api/collections \
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
https://www.calendar-aggregator.online/api/calendar/abc123-def456-ghi789
```

## 🛠️ Technology Stack

This calendar aggregator is built with:

- **[Next.js 15.3.5](https://nextjs.org/)** - React framework with App Router and serverless functions
- **[React 19.1.0](https://react.dev/)** - Latest React with improved performance
- **[TypeScript 5.8.3](https://www.typescriptlang.org/)** - Type safety and better developer experience
- **[Tailwind CSS 3.4.16](https://tailwindcss.com/)** - Utility-first CSS framework for styling
- **[node-ical 0.20.1](https://www.npmjs.com/package/node-ical)** - iCal parsing and processing
- **[Vitest 3.2.4](https://vitest.dev/)** - Fast unit testing framework
- **[Zod 4.0.5](https://zod.dev/)** - TypeScript-first schema validation
- **[Supabase](https://supabase.com/)** - Optional PostgreSQL database for persistent storage
- **Real-time aggregation** - Fetches calendars on-demand with optional persistence
- **GUID-based collections** - Secure access with cryptographically secure identifiers

## 📁 Project Structure

```
src/
├── app/
│   └── api/                    # API endpoints
│       ├── collections/        # Collection CRUD operations
│       │   └── [guid]/         # Individual collection management
│       ├── calendar/[guid]/    # Main calendar feed endpoint
│       └── health/             # Health check endpoint (includes Supabase status)
├── lib/
│   ├── calendar-utils.ts       # URL validation and connection testing
│   ├── calendar-fetcher.ts     # iCal fetching and parsing
│   ├── ical-combiner.ts        # Real-time iCal combination utility
│   └── supabase.ts             # Supabase client and database operations
└── types/
    └── calendar.ts             # TypeScript interfaces for collections and calendars
schema.sql                      # Database schema for Supabase setup
```

## 🧪 Testing & Development

```bash
npm run dev         # Start development server (with Turbo)
npm run build       # Build for production
npm run test        # Run unit tests with Vitest
npm run test:watch  # Run tests in watch mode
npm run test:ui     # Run tests with UI interface
npm run lint        # Check code quality
npm run lint:fix    # Auto-fix linting issues
npm run type-check  # TypeScript validation
npm run format      # Format code with Prettier
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

This is a **serverless implementation** with optional persistence:

- **Dual storage modes**: Supabase database (persistent) with in-memory fallback
- **Graceful degradation**: Automatically falls back to in-memory storage if database unavailable
- **No authentication**: API endpoints are publicly accessible (secured by GUID)
- **Real-time fetching**: Events are fetched on-demand, not cached
- **Timeout protection**: 15-second timeout per calendar source
- **Error resilience**: Failed calendars don't break the entire feed

## 🗄️ Supabase Setup (Optional)

For persistent calendar collection storage:

### 1. Create a Supabase Project

1. Visit [supabase.com](https://supabase.com) and create a new project
2. Wait for the project to be fully provisioned
3. Go to Project Settings → API to find your credentials

### 2. Set Up the Database Schema

Run the SQL from `schema.sql` in your Supabase SQL Editor:

```sql
CREATE TABLE calendar_collections (
  guid UUID PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  sources JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_calendar_collections_created_at ON calendar_collections(created_at);
```

### 3. Configure Environment Variables

Add your Supabase credentials to `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Verify Connection

Check the health endpoint to confirm Supabase is connected:

```bash
curl http://localhost:3000/api/health
```

### 5. Deploy with Supabase

When deploying to production, add the same environment variables to your deployment platform (Vercel, Netlify, etc.).

## 🚀 Deployment

**Already deployed!** The production version is live at:
https://www.calendar-aggregator.online/

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
