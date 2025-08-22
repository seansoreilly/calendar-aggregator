import { NextRequest, NextResponse } from 'next/server'
import {
  CalendarCollection,
  CalendarSource,
  UpdateCollectionRequest,
} from '../../../../types/calendar'
import { normalizeCalendarUrl } from '../../../../lib/calendar-utils'
import {
  deleteCollectionFromDatabase,
  updateCollectionInDatabase,
  findCollectionByGuidInDatabase,
} from '../../../../lib/supabase'

/**
 * GET /api/collections/[guid] - Get specific collection
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

    const collection = await findCollectionByGuidInDatabase(guid)

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
    const { guid } = await params
    const body: UpdateCollectionRequest = await request.json()

    if (!guid) {
      return NextResponse.json({ error: 'GUID is required' }, { status: 400 })
    }

    // Check if collection exists
    const existingCollection = await findCollectionByGuidInDatabase(guid)
    if (!existingCollection) {
      return NextResponse.json(
        { error: 'Collection not found' },
        { status: 404 }
      )
    }

    // Basic validation for name
    if (body.name !== undefined && !body.name.trim()) {
      return NextResponse.json(
        { error: 'Collection name cannot be empty' },
        { status: 400 }
      )
    }

    // Prepare update object
    const updates: Partial<CalendarCollection> = {}
    if (body.name !== undefined) updates.name = body.name
    if (body.description !== undefined) updates.description = body.description
    if (body.calendars !== undefined) {
      // Basic validation for calendars
      if (!Array.isArray(body.calendars) || body.calendars.length === 0) {
        return NextResponse.json(
          { error: 'Calendars must be a non-empty array' },
          { status: 400 }
        )
      }

      // Process calendars (simplified version)
      const processedCalendars: CalendarSource[] = body.calendars.map(
        (cal, i) => ({
          id: i + 1,
          url: normalizeCalendarUrl(cal.url),
          name: cal.name,
          color: cal.color || '#3b82f6',
          enabled: cal.enabled !== false,
          createdAt: new Date().toISOString(),
          syncStatus: 'idle',
        })
      )

      updates.calendars = processedCalendars
    }

    // Update in database
    const updatedCollection = await updateCollectionInDatabase(guid, updates)

    if (!updatedCollection) {
      return NextResponse.json(
        { error: 'Failed to update collection' },
        { status: 500 }
      )
    }

    return NextResponse.json(updatedCollection)
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
    const { guid } = await params

    if (!guid) {
      return NextResponse.json({ error: 'GUID is required' }, { status: 400 })
    }

    // Check if collection exists first
    const existingCollection = await findCollectionByGuidInDatabase(guid)
    if (!existingCollection) {
      return NextResponse.json(
        { error: 'Collection not found' },
        { status: 404 }
      )
    }

    // Delete from database
    const deleted = await deleteCollectionFromDatabase(guid)

    if (!deleted) {
      return NextResponse.json(
        { error: 'Failed to delete collection' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Collection deleted successfully',
      collection: existingCollection,
    })
  } catch {
    return NextResponse.json(
      { error: 'Failed to delete collection' },
      { status: 500 }
    )
  }
}
