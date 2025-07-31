import { NextRequest, NextResponse } from 'next/server'
import {
  CalendarCollection,
  CalendarSource,
  UpdateCollectionRequest,
} from '../../../../types/calendar'
import {
  validateCalendarUrl,
  normalizeCalendarUrl,
} from '../../../../lib/calendar-utils'

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
 * GET /api/collections/[guid] - Get specific collection
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

    const collection = findCollectionByGuid(guid)

    if (!collection) {
      return NextResponse.json(
        { error: 'Collection not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(collection)
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch collection' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/collections/[guid] - Update collection
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ guid: string }> }
) {
  try {
    initializeStorage()

    const { guid } = await params
    const body: UpdateCollectionRequest = await request.json()

    if (!guid) {
      return NextResponse.json({ error: 'GUID is required' }, { status: 400 })
    }

    const collection = findCollectionByGuid(guid)

    if (!collection) {
      return NextResponse.json(
        { error: 'Collection not found' },
        { status: 404 }
      )
    }

    // Update name if provided
    if (body.name !== undefined) {
      if (!body.name.trim()) {
        return NextResponse.json(
          { error: 'Collection name cannot be empty' },
          { status: 400 }
        )
      }

      // Check for duplicate names (excluding current collection)
      const existingCollection = globalThis.calendarCollections.find(
        col =>
          col.guid !== guid &&
          body.name &&
          col.name.toLowerCase() === body.name.toLowerCase()
      )
      if (existingCollection) {
        return NextResponse.json(
          { error: 'Collection name already exists' },
          { status: 409 }
        )
      }

      collection.name = body.name
    }

    // Update description if provided
    if (body.description !== undefined) {
      collection.description = body.description
    }

    // Update calendars if provided
    if (body.calendars !== undefined) {
      if (!Array.isArray(body.calendars)) {
        return NextResponse.json(
          { error: 'Calendars must be an array' },
          { status: 400 }
        )
      }

      if (body.calendars.length === 0) {
        return NextResponse.json(
          { error: 'At least one calendar is required' },
          { status: 400 }
        )
      }

      // Validate and process calendars
      const processedCalendars: CalendarSource[] = []
      const validationErrors: string[] = []

      for (let i = 0; i < body.calendars.length; i++) {
        const calendarData = body.calendars[i]

        if (!calendarData || !calendarData.url || !calendarData.name) {
          validationErrors.push(`Calendar ${i + 1}: URL and name are required`)
          continue
        }

        // Validate calendar URL
        const validationResult = await validateCalendarUrl(calendarData.url)
        if (!validationResult.isValid) {
          validationErrors.push(
            `Calendar ${i + 1} (${calendarData.name}): ${validationResult.error}`
          )
          continue
        }

        const normalizedUrl = normalizeCalendarUrl(calendarData.url)

        const processedCalendar: CalendarSource = {
          id: i + 1, // Temporary ID for the collection context
          url: normalizedUrl,
          name: calendarData.name,
          color: calendarData.color || '#3b82f6',
          enabled: calendarData.enabled !== false,
          createdAt:
            collection.calendars[i]?.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          syncStatus: 'idle',
        }

        processedCalendars.push(processedCalendar)
      }

      if (validationErrors.length > 0) {
        return NextResponse.json(
          {
            error: 'Calendar validation failed',
            details: validationErrors,
          },
          { status: 400 }
        )
      }

      if (processedCalendars.length === 0) {
        return NextResponse.json(
          { error: 'No valid calendars provided' },
          { status: 400 }
        )
      }

      collection.calendars = processedCalendars
    }

    // Update timestamp
    collection.updatedAt = new Date().toISOString()

    return NextResponse.json(collection)
  } catch (error) {
    console.error('Error updating collection:', error)
    return NextResponse.json(
      { error: 'Failed to update collection' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/collections/[guid] - Delete collection
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ guid: string }> }
) {
  try {
    initializeStorage()

    const { guid } = await params

    if (!guid) {
      return NextResponse.json({ error: 'GUID is required' }, { status: 400 })
    }

    const collectionIndex = globalThis.calendarCollections.findIndex(
      col => col.guid === guid
    )

    if (collectionIndex === -1) {
      return NextResponse.json(
        { error: 'Collection not found' },
        { status: 404 }
      )
    }

    const deletedCollection = globalThis.calendarCollections.splice(
      collectionIndex,
      1
    )[0]

    return NextResponse.json({
      message: 'Collection deleted successfully',
      collection: deletedCollection,
    })
  } catch {
    return NextResponse.json(
      { error: 'Failed to delete collection' },
      { status: 500 }
    )
  }
}
