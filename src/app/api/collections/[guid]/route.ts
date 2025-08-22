import { NextRequest, NextResponse } from 'next/server'
import {
  CalendarCollection,
  CalendarSource,
  UpdateCollectionRequest,
} from '../../../../types/calendar'
import { normalizeCalendarUrl } from '../../../../lib/calendar-utils'
import { getSupabase } from '../../../../lib/supabase'

/**
 * Initialize global storage if needed
 */
function initializeStorage() {
  if (!globalThis.calendarCollections) {
    globalThis.calendarCollections = []
  }
}

/**
 * Delete collection from Supabase with fallback
 */
async function deleteCollectionFromDatabase(guid: string): Promise<boolean> {
  try {
    const supabase = getSupabase()
    const { error } = await supabase
      .from('collections')
      .delete()
      .eq('guid', guid)

    if (error) throw error
    return true
  } catch {
    // Fallback to in-memory storage
    initializeStorage()
    const index = globalThis.calendarCollections.findIndex(
      col => col.guid === guid
    )
    if (index >= 0) {
      globalThis.calendarCollections.splice(index, 1)
      return true
    }
    return false
  }
}

/**
 * Update collection in Supabase with fallback
 */
async function updateCollectionInDatabase(
  guid: string,
  updates: Partial<CalendarCollection>
): Promise<CalendarCollection | null> {
  try {
    const supabase = getSupabase()
    const now = new Date().toISOString()

    // Prepare update data for database
    const updateData: Record<string, unknown> = { updated_at: now }
    if (updates.name !== undefined) updateData.name = updates.name
    if (updates.description !== undefined)
      updateData.description = updates.description
    if (updates.calendars !== undefined) {
      updateData.sources = updates.calendars // Map calendars to sources
    }

    const { data, error } = await supabase
      .from('collections')
      .update(updateData)
      .eq('guid', guid)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null // Not found
      }
      throw error
    }

    // Transform to expected format
    return {
      guid: data.guid as string,
      name: data.name as string,
      description: data.description as string,
      calendars: (data.sources as CalendarSource[]) || [],
      createdAt: data.created_at as string,
      updatedAt: data.updated_at as string,
    }
  } catch {
    // Fallback to in-memory storage
    initializeStorage()
    const collection = globalThis.calendarCollections.find(
      col => col.guid === guid
    )
    if (!collection) return null

    // Apply updates
    Object.assign(collection, updates)
    collection.updatedAt = new Date().toISOString()
    return collection
  }
}

/**
 * Find collection by GUID with Supabase integration
 */
async function findCollectionByGuid(
  guid: string
): Promise<CalendarCollection | null> {
  try {
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('collections')
      .select('*')
      .eq('guid', guid)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null // Not found
      }
      throw error
    }

    // Transform database record to expected format
    return {
      guid: data.guid as string,
      name: data.name as string,
      description: data.description as string,
      calendars: (data.sources as CalendarSource[]) || [],
      createdAt: data.created_at as string,
      updatedAt: data.updated_at as string,
    }
  } catch {
    // Fallback to in-memory storage
    initializeStorage()
    return globalThis.calendarCollections.find(col => col.guid === guid) || null
  }
}

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

    const collection = await findCollectionByGuid(guid)

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

    // Check if collection exists
    const existingCollection = await findCollectionByGuid(guid)
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
    const existingCollection = await findCollectionByGuid(guid)
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
