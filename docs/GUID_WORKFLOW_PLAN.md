# 🔄 GUID-Based Real-Time Calendar Aggregation Plan

## Overview

This document outlines the implementation plan for transitioning the Calendar Aggregator from a complex sync-based system to a simple, real-time GUID-based workflow that eliminates the need for event persistence.

## 🎯 Desired Workflow

1. **Client Request**: `GET /api/calendar/{guid}` - Client requests calendar by GUID
2. **Lookup**: App looks up which iCal feed URLs are associated with that GUID
3. **Real-time Fetch**: App fetches all iCal feeds in parallel from source servers
4. **Combine & Return**: App merges iCal feeds and returns unified .ics output

## 📊 Refactoring Assessment: **MINIMAL**

### ✅ Existing Code to Reuse (85%)

The current codebase already contains most of the required functionality:

- **✅ Calendar fetching infrastructure** (`src/lib/calendar-fetcher.ts`)
  - Proven to work with test calendars (1,545 events successfully processed)
  - Handles concurrent fetching of multiple calendars
  - Robust error handling for network failures
  - URL validation and connection testing

- **✅ iCal parsing and processing**
  - Converts iCal events to standardized format
  - Handles various event formats (Google Calendar, Outlook, etc.)
  - Processes recurring events, timezones, attendees

- **✅ HTTP request handling**
  - Next.js API routes structure
  - Request validation and error responses
  - TypeScript interfaces for type safety

### 🔄 Code Changes Required (15%)

#### 1. **New Data Model** (Low Effort - 1 hour)

```typescript
// New interface for GUID-based calendar collections
interface CalendarCollection {
  guid: string
  name: string
  description?: string
  calendars: CalendarSource[] // Reuse existing CalendarSource type
  createdAt: string
  updatedAt?: string
}

// Storage (in-memory for now, same pattern as existing)
declare global {
  var calendarCollections: CalendarCollection[]
}
```

#### 2. **GUID Management API** (Low Effort - 2 hours)

**File**: `src/app/api/collections/route.ts`

```typescript
// POST /api/collections - Create new calendar collection
// GET /api/collections - List all collections
// PUT /api/collections/{guid} - Update collection
// DELETE /api/collections/{guid} - Delete collection
```

Features:

- CRUD operations for GUID→calendar URL mappings
- Calendar URL validation (reuse existing validation logic)
- GUID generation (crypto.randomUUID())

#### 3. **iCal Combiner Utility** (Medium Effort - 3 hours)

**File**: `src/lib/ical-combiner.ts`

```typescript
export interface CombineResult {
  success: boolean
  icalContent: string
  eventsCount: number
  calendarsProcessed: number
  errors: string[]
  warnings: string[]
}

export async function combineICalFeeds(
  calendars: CalendarSource[]
): Promise<CombineResult>
```

Features:

- Merge multiple .ics feeds into single output
- Handle VCALENDAR headers and metadata
- Preserve timezone information (VTIMEZONE blocks)
- Deduplicate events with same UID across calendars
- Generate proper iCal structure with PRODID

#### 4. **Main GUID Endpoint** (Medium Effort - 2 hours)

**File**: `src/app/api/calendar/[guid]/route.ts`

```typescript
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ guid: string }> }
): Promise<Response>
```

Workflow:

1. Extract GUID from URL parameters
2. Look up calendar collection by GUID
3. Fetch all calendar URLs in parallel (reuse `fetchMultipleCalendars`)
4. Combine iCal outputs using new combiner utility
5. Return unified .ics file with proper content-type headers

#### 5. **Update Existing Calendar Management** (Low Effort - 1 hour)

Minor updates to existing calendar management to support the new workflow:

- Update OpenAPI specification
- Add GUID references to existing calendar types
- Optionally keep existing individual calendar endpoints for admin purposes

## 🚀 Performance Benefits

### Real-time Advantages

- **Always Fresh Data**: No stale cache or sync delays
- **Stateless Architecture**: No background jobs or complex sync processes
- **Simple Scaling**: Standard horizontal API scaling patterns
- **Lower Complexity**: Eliminates event storage, sync status tracking

### Request Performance

- **Parallel Fetching**: All source calendars fetched concurrently
- **Efficient Processing**: Direct iCal-to-iCal conversion (no intermediate storage)
- **Caching Opportunities**: HTTP-level caching at reverse proxy/CDN level

## 📋 Implementation Timeline

| Task                                      | Effort  | Priority | Files                                  |
| ----------------------------------------- | ------- | -------- | -------------------------------------- |
| 1. Create calendar collections data model | 1 hour  | High     | `src/types/calendar.ts`                |
| 2. Build GUID management API              | 2 hours | High     | `src/app/api/collections/route.ts`     |
| 3. Create iCal combiner utility           | 3 hours | High     | `src/lib/ical-combiner.ts`             |
| 4. Implement main GUID endpoint           | 2 hours | High     | `src/app/api/calendar/[guid]/route.ts` |
| 5. Update documentation and types         | 1 hour  | Medium   | Various files                          |

**Total Effort: ~9 hours** (vs ~20+ hours for event persistence approach)

## 🎯 Example API Usage

### 1. Create Calendar Collection

```bash
POST /api/collections
Content-Type: application/json

{
  "name": "My Combined Work Calendar",
  "description": "Work events from Google and Outlook",
  "calendars": [
    {
      "url": "https://calendar.google.com/calendar/ical/work@company.com/public/basic.ics",
      "name": "Google Work Calendar"
    },
    {
      "url": "https://outlook.office365.com/owa/calendar/user@company.com/calendar.ics",
      "name": "Outlook Work Calendar"
    }
  ]
}
```

Response:

```json
{
  "guid": "abc-123-def-456",
  "name": "My Combined Work Calendar",
  "calendars": [...],
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

### 2. Access Combined Calendar

```bash
GET /api/calendar/abc-123-def-456
Accept: text/calendar
```

Response:

```
Content-Type: text/calendar
Content-Disposition: attachment; filename="combined-calendar.ics"

BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Calendar Aggregator//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH

BEGIN:VEVENT
UID:event1@google.com
DTSTART:20240101T120000Z
DTEND:20240101T130000Z
SUMMARY:Team Meeting
DESCRIPTION:Weekly team sync
END:VEVENT

BEGIN:VEVENT
UID:event2@outlook.com
DTSTART:20240101T140000Z
DTEND:20240101T150000Z
SUMMARY:Project Review
END:VEVENT

END:VCALENDAR
```

## 🔧 Technical Considerations

### Error Handling

- **Partial Failures**: If some calendars fail to fetch, include successful ones in output
- **Timeout Handling**: Set reasonable timeouts for real-time requests (10-15 seconds)
- **Error Reporting**: Include warnings in response headers or metadata

### Caching Strategy

- **HTTP Caching**: Standard cache-control headers based on source calendar TTL
- **Optional Short-term Cache**: 5-minute in-memory cache to handle burst requests
- **CDN Compatibility**: Design responses to work with CDN caching

### Security Considerations

- **GUID Privacy**: Use cryptographically secure UUIDs to prevent enumeration
- **Rate Limiting**: Protect against abuse of real-time fetching
- **URL Validation**: Ensure only valid calendar URLs are accepted

## 🎉 Success Criteria

After implementation, the system should:

1. ✅ **Accept GUID requests** and return combined iCal output
2. ✅ **Process test calendars** (1,545 events from Google + Outlook) in real-time
3. ✅ **Handle concurrent requests** efficiently
4. ✅ **Maintain compatibility** with standard calendar clients
5. ✅ **Provide proper error handling** for failed calendar fetches
6. ✅ **Support standard iCal features** (timezones, recurring events, etc.)

## 🔄 Migration Path

This approach allows for **gradual migration**:

1. **Phase 1**: Implement new GUID endpoints alongside existing API
2. **Phase 2**: Test with existing calendar sources
3. **Phase 3**: Gradually migrate clients to new workflow
4. **Phase 4**: Optional cleanup of old sync-based endpoints

The new system is **much simpler** than the original event persistence plan and leverages the existing, proven calendar fetching infrastructure that already successfully processes real calendar feeds.
