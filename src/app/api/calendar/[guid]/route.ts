import { NextRequest, NextResponse } from 'next/server'
import { CalendarCollection } from '../../../../types/calendar'
import { combineICalFeeds } from '../../../../lib/ical-combiner'

// Global storage for collections (in-memory for development)
declare global {
  var calendarCollections: CalendarCollection[]
}

/**
 * Initialize global storage if needed
 */
function initializeStorage() {
  if (!globalThis.calendarCollections) {
    globalThis.calendarCollections = []
  }
}

/**
 * Find collection by GUID
 */
function findCollectionByGuid(guid: string): CalendarCollection | undefined {
  return globalThis.calendarCollections.find(col => col.guid === guid)
}

/**
 * GET /api/calendar/[guid] - Get combined iCal feed for a collection
 *
 * This is the main endpoint for the GUID-based workflow:
 * 1. Lookup collection by GUID
 * 2. Fetch all calendar sources in parallel
 * 3. Combine into unified iCal output
 * 4. Return as .ics file
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ guid: string }> }
) {
  try {
    initializeStorage()

    const { guid } = await params

    if (!guid) {
      return NextResponse.json({ error: 'GUID is required' }, { status: 400 })
    }

    // Validate GUID format (basic UUID validation)
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(guid)) {
      return NextResponse.json(
        { error: 'Invalid GUID format' },
        { status: 400 }
      )
    }

    // Find the collection
    const collection = findCollectionByGuid(guid)

    if (!collection) {
      return NextResponse.json(
        { error: 'Calendar collection not found' },
        { status: 404 }
      )
    }

    // Check if collection has any enabled calendars
    const enabledCalendars = collection.calendars.filter(cal => cal.enabled)

    if (enabledCalendars.length === 0) {
      return NextResponse.json(
        { error: 'No enabled calendars in collection' },
        { status: 404 }
      )
    }

    // Get timeout from query parameters (default: 15 seconds for real-time requests)
    const url = new URL(request.url)
    const timeoutParam = url.searchParams.get('timeout')
    const timeoutMs = timeoutParam ? parseInt(timeoutParam, 10) : 15000

    if (timeoutMs < 1000 || timeoutMs > 30000) {
      return NextResponse.json(
        { error: 'Timeout must be between 1000ms and 30000ms' },
        { status: 400 }
      )
    }

    // Combine the iCal feeds
    const combineResult = await combineICalFeeds(
      collection.calendars,
      timeoutMs
    )

    if (!combineResult.success) {
      // Return partial results if some calendars succeeded
      if (combineResult.calendarsProcessed > 0 && combineResult.icalContent) {
        return new NextResponse(combineResult.icalContent, {
          status: 206, // Partial Content
          headers: {
            'Content-Type': 'text/calendar; charset=utf-8',
            'Content-Disposition': `attachment; filename="${collection.name.replace(/[^a-zA-Z0-9-_]/g, '-')}.ics"`,
            'X-Calendar-Errors': JSON.stringify(combineResult.errors),
            'X-Calendar-Warnings': JSON.stringify(combineResult.warnings),
            'X-Calendar-Events-Count': combineResult.eventsCount.toString(),
            'X-Calendar-Sources-Processed':
              combineResult.calendarsProcessed.toString(),
            'X-Calendar-Sources-Total': collection.calendars
              .filter(cal => cal.enabled)
              .length.toString(),
            'Cache-Control': 'public, max-age=300', // 5 minute cache
          },
        })
      }

      // Complete failure
      return NextResponse.json(
        {
          error: 'Failed to fetch calendar data',
          details: combineResult.errors,
          warnings: combineResult.warnings,
        },
        { status: 503 } // Service Unavailable
      )
    }

    // Success - return the combined iCal content
    const response = new NextResponse(combineResult.icalContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="${collection.name.replace(/[^a-zA-Z0-9-_]/g, '-')}.ics"`,
        'X-Calendar-Events-Count': combineResult.eventsCount.toString(),
        'X-Calendar-Sources-Processed':
          combineResult.calendarsProcessed.toString(),
        'X-Calendar-Sources-Total': collection.calendars
          .filter(cal => cal.enabled)
          .length.toString(),
        'Cache-Control': 'public, max-age=300', // 5 minute cache
      },
    })

    // Add warnings header if there were any
    if (combineResult.warnings.length > 0) {
      response.headers.set(
        'X-Calendar-Warnings',
        JSON.stringify(combineResult.warnings)
      )
    }

    return response
  } catch (error) {
    console.error('Error in calendar GUID endpoint:', error)

    return NextResponse.json(
      {
        error: 'Internal server error',
        message:
          'An unexpected error occurred while processing the calendar request',
      },
      { status: 500 }
    )
  }
}

/**
 * HEAD /api/calendar/[guid] - Check if collection exists and get metadata
 * Useful for clients to verify collection exists without downloading content
 */
export async function HEAD(
  request: NextRequest,
  { params }: { params: Promise<{ guid: string }> }
) {
  try {
    initializeStorage()

    const { guid } = await params

    if (!guid) {
      return new NextResponse(null, { status: 400 })
    }

    // Validate GUID format
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(guid)) {
      return new NextResponse(null, { status: 400 })
    }

    // Find the collection
    const collection = findCollectionByGuid(guid)

    if (!collection) {
      return new NextResponse(null, { status: 404 })
    }

    // Check if collection has any enabled calendars
    const enabledCalendars = collection.calendars.filter(cal => cal.enabled)

    if (enabledCalendars.length === 0) {
      return new NextResponse(null, { status: 404 })
    }

    return new NextResponse(null, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'X-Collection-Name': collection.name,
        'X-Collection-Description': collection.description || '',
        'X-Calendar-Sources-Count': enabledCalendars.length.toString(),
        'X-Collection-Created': collection.createdAt,
        'X-Collection-Updated': collection.updatedAt || collection.createdAt,
        'Cache-Control': 'public, max-age=300',
      },
    })
  } catch {
    return new NextResponse(null, { status: 500 })
  }
}
