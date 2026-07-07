import { NextRequest, NextResponse } from 'next/server'
import {
  CalendarCollection,
  CalendarSource,
  UpdateCollectionRequest,
} from '../../../../types/calendar'
import { buildCalendarSource } from '../../../../lib/calendar-utils'
import {
  deleteCollectionFromDatabase,
  updateCollectionInDatabase,
  findCollectionByGuidInDatabase,
} from '../../../../lib/supabase'
import {
  validateId,
  validateCollectionUpdateRequest,
} from '../../../../lib/validation'
import {
  CollectionNotFoundError,
  errorResponse,
  isCalendarCollectionError,
  toCalendarCollectionError,
} from '../../../../lib/errors'

/**
 * GET /api/collections/[guid] - Get specific collection
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ guid: string }> }
) {
  try {
    const { guid } = await params

    // Validate ID format (UUID or custom ID)
    try {
      validateId(guid)
    } catch (error) {
      if (isCalendarCollectionError(error)) {
        return errorResponse(error)
      }
      throw error
    }

    const collection = await findCollectionByGuidInDatabase(guid)

    if (!collection) {
      return errorResponse(new CollectionNotFoundError(guid), false)
    }

    return NextResponse.json(collection)
  } catch (error) {
    console.error('Error fetching collection:', error)
    const appError = toCalendarCollectionError(error, 'fetch_collection')
    return errorResponse(appError, false)
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

    // Validate ID format and request body (shared with POST — enforces length
    // caps and control-char/CRLF rejection so a PUT'd name/description can't be
    // used to inject response headers downstream).
    try {
      validateId(guid)
      validateCollectionUpdateRequest(body)
    } catch (error) {
      if (isCalendarCollectionError(error)) {
        return errorResponse(error)
      }
      throw error
    }

    // Prepare update object
    const updates: Partial<CalendarCollection> = {}
    if (body.name !== undefined) updates.name = body.name
    if (body.description !== undefined) updates.description = body.description
    if (body.calendars !== undefined) {
      const processedCalendars: CalendarSource[] =
        body.calendars.map(buildCalendarSource)

      updates.calendars = processedCalendars
    }

    // Update in database. updateCollectionInDatabase returns null when no row
    // matched, so we can map that straight to 404 without a pre-lookup.
    const updatedCollection = await updateCollectionInDatabase(guid, updates)

    if (!updatedCollection) {
      return errorResponse(new CollectionNotFoundError(guid), false)
    }

    return NextResponse.json(updatedCollection)
  } catch (error) {
    console.error('Error updating collection:', error)
    const appError = toCalendarCollectionError(error, 'update_collection')
    return errorResponse(appError, false)
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

    // Validate ID format (UUID or custom ID)
    try {
      validateId(guid)
    } catch (error) {
      if (isCalendarCollectionError(error)) {
        return errorResponse(error)
      }
      throw error
    }

    // Delete from database. deleteCollectionFromDatabase returns false when no
    // row matched, so that maps straight to 404 without a pre-lookup.
    const deleted = await deleteCollectionFromDatabase(guid)

    if (!deleted) {
      return errorResponse(new CollectionNotFoundError(guid), false)
    }

    return NextResponse.json({
      message: 'Collection deleted successfully',
      guid,
    })
  } catch (error) {
    console.error('Error deleting collection:', error)
    const appError = toCalendarCollectionError(error, 'delete_collection')
    return errorResponse(appError, false)
  }
}
