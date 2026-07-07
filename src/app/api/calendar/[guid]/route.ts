import { NextRequest, NextResponse } from 'next/server'
import { combineICalFeeds } from '../../../../lib/ical-combiner'
import { findCollectionByGuidInDatabase } from '../../../../lib/supabase'
import { validateId } from '../../../../lib/validation'
import {
  errorResponse,
  isCalendarCollectionError,
} from '../../../../lib/errors'
import {
  computeICalETag,
  createCalendarHeadResponse,
  createCalendarNotModifiedResponse,
  createCalendarPartialResponse,
  createCalendarSuccessResponse,
  parseCalendarTimeout,
} from '../../../../lib/calendar-response'
import { trackEvent } from '../../../../lib/analytics'

async function findValidatedCollection(guid: string) {
  validateId(guid)

  return await findCollectionByGuidInDatabase(guid)
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
    const { guid } = await params

    if (!guid) {
      return NextResponse.json({ error: 'GUID is required' }, { status: 400 })
    }

    try {
      const collection = await findValidatedCollection(guid)
      if (!collection) {
        trackEvent('calendar_feed_error', {
          collection_id: guid,
          error_type: 'not_found',
        })
        return NextResponse.json(
          { error: 'Calendar collection not found' },
          { status: 404 }
        )
      }

      const enabledCalendars = collection.calendars.filter(cal => cal.enabled)
      if (enabledCalendars.length === 0) {
        trackEvent('calendar_feed_error', {
          collection_id: guid,
          error_type: 'no_enabled_calendars',
        })
        return NextResponse.json(
          { error: 'No enabled calendars in collection' },
          { status: 404 }
        )
      }

      const timeoutMs = parseCalendarTimeout(request.url)
      if (timeoutMs === null) {
        return NextResponse.json(
          { error: 'Timeout must be between 1000ms and 30000ms' },
          { status: 400 }
        )
      }

      console.log(`[Calendar API] Processing request for GUID: ${guid}`)
      console.log(`[Calendar API] Collection: ${collection.name}`)
      console.log(
        `[Calendar API] Enabled calendars: ${enabledCalendars.length}`
      )
      console.log(`[Calendar API] Timeout: ${timeoutMs}ms`)

      const combineResult = await combineICalFeeds(
        collection.calendars,
        timeoutMs
      )

      console.log(`[Calendar API] Combine result:`, {
        status: combineResult.status,
        calendarsProcessed: combineResult.calendarsProcessed,
        eventsCount: combineResult.eventsCount,
        errorsCount: combineResult.errors.length,
        warningsCount: combineResult.warnings.length,
      })

      // Total failure: no source could be fetched → 503.
      if (combineResult.status === 'failed') {
        console.error(
          `[Calendar API] Failed to combine feeds for ${guid}:`,
          combineResult.errors
        )
        trackEvent('calendar_feed_error', {
          collection_id: guid,
          error_type: 'combine_failed',
        })
        return NextResponse.json(
          { error: 'One or more calendar sources are unavailable' },
          { status: 503 }
        )
      }

      // Conditional GET: if the client already holds this exact feed (by strong
      // ETag over the combined body), return 304 with no body. The upstream
      // sources were still fetched server-side to derive the ETag; the 304 only
      // saves the client re-downloading and re-parsing the unchanged feed.
      const etag = computeICalETag(combineResult.icalContent)
      const ifNoneMatch = request.headers.get('If-None-Match')
      if (ifNoneMatch && ifNoneMatch === etag) {
        return createCalendarNotModifiedResponse(etag)
      }

      const partial = combineResult.status === 'partial'
      trackEvent('calendar_feed_retrieved', {
        collection_id: guid,
        events_count: combineResult.eventsCount,
        calendars_count: combineResult.calendarsProcessed,
        partial: partial ? 1 : 0,
      })

      if (partial) {
        console.error(
          `[Calendar API] Partial feed for ${guid}:`,
          combineResult.errors
        )
        return createCalendarPartialResponse(collection, combineResult)
      }

      return createCalendarSuccessResponse(collection, combineResult)
    } catch (error) {
      if (isCalendarCollectionError(error)) {
        return errorResponse(error, false)
      }
      throw error
    }
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

    try {
      const collection = await findValidatedCollection(guid)
      if (!collection) {
        return new NextResponse(null, { status: 404 })
      }

      if (collection.calendars.every(cal => !cal.enabled)) {
        return new NextResponse(null, { status: 404 })
      }

      return createCalendarHeadResponse(collection)
    } catch (error) {
      if (isCalendarCollectionError(error)) {
        return new NextResponse(null, { status: 400 })
      }
      throw error
    }
  } catch {
    return new NextResponse(null, { status: 500 })
  }
}
