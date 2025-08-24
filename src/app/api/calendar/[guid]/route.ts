import { NextRequest, NextResponse } from 'next/server'
import { combineICalFeeds } from '../../../../lib/ical-combiner'
import { findCollectionByGuidInDatabase } from '../../../../lib/supabase'
import { validateId } from '../../../../lib/validation'
import { isCalendarCollectionError } from '../../../../lib/errors'

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
    const { guid } = await params

    if (!guid) {
      return NextResponse.json({ error: 'GUID is required' }, { status: 400 })
    }

    // Validate ID format (UUID or custom ID)
    try {
      validateId(guid)
    } catch (error) {
      if (isCalendarCollectionError(error)) {
        return NextResponse.json(
          {
            error: error.message,
            code: error.code,
          },
          { status: error.statusCode }
        )
      }
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 })
    }

    // Find the collection
    const collection = await findCollectionByGuidInDatabase(guid)

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

    // Log request details for debugging
    console.log(`[Calendar API] Processing request for GUID: ${guid}`)
    console.log(`[Calendar API] Collection: ${collection.name}`)
    console.log(`[Calendar API] Enabled calendars: ${enabledCalendars.length}`)
    console.log(`[Calendar API] Timeout: ${timeoutMs}ms`)

    // Combine the iCal feeds
    const combineResult = await combineICalFeeds(
      collection.calendars,
      timeoutMs
    )

    console.log(`[Calendar API] Combine result:`, {
      success: combineResult.success,
      calendarsProcessed: combineResult.calendarsProcessed,
      eventsCount: combineResult.eventsCount,
      errorsCount: combineResult.errors.length,
      warningsCount: combineResult.warnings.length,
    })

    if (!combineResult.success) {
      console.error(
        `[Calendar API] Failed to combine feeds for ${guid}:`,
        combineResult.errors
      )
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
    const { guid } = await params

    if (!guid) {
      return new NextResponse(null, { status: 400 })
    }

    // Validate ID format (UUID or custom ID)
    try {
      validateId(guid)
    } catch {
      return new NextResponse(null, { status: 400 })
    }

    // Find the collection
    const collection = await findCollectionByGuidInDatabase(guid)

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
