# Calendar Aggregator

A powerful GUID-based calendar aggregation service that seamlessly combines multiple iCal feeds into unified calendar collections. Built with Next.js 15, TypeScript, and modern serverless architecture featuring a stunning glassmorphism UI.

## ✨ Modern Web Interface

Experience the **beautiful glassmorphism design** with:

- 🎨 **Glass-effect panels** with backdrop blur and transparency
- 🌊 **Animated gradient blobs** creating dynamic backgrounds
- 💫 **Smooth hover animations** and interactive transitions
- 🌈 **Gradient accents** throughout the interface
- 📱 **Responsive design** optimized for all screen sizes
- ⚡ **Real-time status indicators** and health monitoring
- 🎯 **Intuitive API exploration** directly from the web interface

## 📅 What It Does

The Calendar Aggregator empowers you to:

- **Create calendar collections** with unique GUIDs or memorable custom IDs
- **Custom memorable URLs** - Use your own IDs like `my-work-schedule` instead of random UUIDs
- **Real-time calendar aggregation** with dual storage modes (Supabase + in-memory fallback)
- **Combine multiple calendars** from different sources (Google Calendar, Outlook, Apple Calendar, etc.)
- **Validate and test** calendar URLs with comprehensive error handling
- **Direct iCal feed output** compatible with all calendar applications
- **Concurrent fetching** with timeout protection and graceful error handling
- **Beautiful web interface** for easy collection management and API testing
- **Live system monitoring** with health status and Supabase connectivity

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

Create a new calendar collection with optional custom ID

```bash
# Create with auto-generated UUID
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
      }
    ]
  }'

# Create with custom ID for memorable URLs
curl -X POST https://www.calendar-aggregator.online/api/collections \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Work Schedule",
    "customId": "my-work-schedule",
    "description": "All my work-related events",
    "calendars": [
      {
        "name": "Work Calendar",
        "url": "https://calendar.google.com/calendar/ical/work@example.com/public/basic.ics",
        "color": "#3b82f6",
        "enabled": true
      }
    ]
  }'
```

**Response**: Returns the created collection with either a unique GUID or your custom ID

**Custom ID Requirements**:

- 3-50 characters long
- Letters, numbers, hyphens, and underscores only
- Cannot start or end with special characters
- Cannot use reserved words (api, admin, calendar, etc.)
- Case-insensitive uniqueness (prevents duplicates)

#### GET /api/collections/{id}

Get a specific collection by GUID or custom ID

#### PUT /api/collections/{id}

Update a collection (name, description, or calendars)

#### DELETE /api/collections/{id}

Remove a collection

### Calendar Feed Access

#### GET /api/calendar/{id}

**Main endpoint** - Get the aggregated iCal feed for subscription

```bash
# Access with UUID
curl https://www.calendar-aggregator.online/api/calendar/4fac5413-98b8-45d1-a8b3-1c26feda1941

# Access with custom ID (much more memorable!)
curl https://www.calendar-aggregator.online/api/calendar/my-work-schedule
```

**Response**: Returns a complete iCal (.ics) file with all events from the collection's calendars

**Headers**:

- `Content-Type: text/calendar; charset=utf-8`
- `Content-Disposition: attachment; filename="collection-name.ics"`
- `Cache-Control: public, max-age=300`

#### HEAD /api/calendar/{id}

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

### 1. Create a Collection with Custom ID

```bash
curl -X POST https://www.calendar-aggregator.online/api/collections \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Calendars",
    "customId": "my-calendars",
    "calendars": [
      {
        "name": "Google Calendar",
        "url": "https://calendar.google.com/calendar/ical/your-email@gmail.com/public/basic.ics",
        "color": "#4285f4"
      }
    ]
  }'
```

### 2. Get Your ID

The response includes your custom ID:

```json
{
  "guid": "my-calendars",
  "name": "My Calendars",
  ...
}
```

### 3. Subscribe in Your Calendar App

Use this memorable URL in Google Calendar, Apple Calendar, or Outlook:

```
https://www.calendar-aggregator.online/api/calendar/my-calendars
```

**Much better than**: `https://www.calendar-aggregator.online/api/calendar/abc123-def456-ghi789`

## 🛠️ Technology Stack

This calendar aggregator is built with modern, cutting-edge technologies:

### Core Framework

- **[Next.js 15.3.5](https://nextjs.org/)** - React framework with App Router and serverless API routes
- **[React 19.1.0](https://react.dev/)** - Latest React with server components and enhanced performance
- **[TypeScript 5.8.3](https://www.typescriptlang.org/)** - Full type safety across frontend and backend

### Styling & UI

- **[Tailwind CSS 3.4.16](https://tailwindcss.com/)** - Utility-first CSS with glassmorphism effects
- **[Lucide React](https://lucide.dev/)** - Beautiful, customizable icons
- **Custom CSS animations** - Smooth blob animations and gradient transitions

### Calendar Processing

- **[node-ical 0.20.1](https://www.npmjs.com/package/node-ical)** - Robust iCal parsing and processing
- **[Axios 1.11.0](https://axios-http.com/)** - HTTP client for calendar feed fetching
- **Custom iCal combiner** - Real-time calendar aggregation with deduplication

### Database & Storage

- **[Supabase](https://supabase.com/)** - PostgreSQL database with real-time capabilities
- **Dual storage modes** - Database persistence with in-memory fallback
- **Graceful degradation** - Automatic fallback when database unavailable

### Development & Testing

- **[Vitest 3.2.4](https://vitest.dev/)** - Fast unit testing with React Testing Library
- **[ESLint](https://eslint.org/)** - Code quality and consistency
- **[Prettier](https://prettier.io/)** - Automated code formatting
- **[Husky](https://typicode.github.io/husky/)** - Git hooks for quality gates

### Architecture Features

- **Serverless functions** - Scalable API endpoints
- **GUID-based security** - Cryptographically secure collection identifiers
- **Real-time aggregation** - On-demand calendar fetching with concurrent processing
- **Timeout protection** - Robust error handling with 15-second timeouts
- **Event deduplication** - Intelligent duplicate removal by UID

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
- **🔗 Custom Memorable URLs**: Choose your own IDs like `my-work-schedule` instead of random UUIDs
- **🔒 GUID-based Security**: Each collection has a unique, unguessable identifier (UUID or custom)
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
