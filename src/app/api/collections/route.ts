import { NextRequest, NextResponse } from 'next/server'
import {
  CalendarCollection,
  CalendarSource,
  CreateCollectionRequest,
} from '../../../types/calendar'
import {
  validateCalendarUrl,
  normalizeCalendarUrl,
} from '../../../lib/calendar-utils'
import { getSupabase } from '../../../lib/supabase'

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
 * Generate a cryptographically secure GUID
 */
function generateGuid(): string {
  return crypto.randomUUID()
}

/**
 * Save collection to Supabase with fallback to memory
 */
async function saveCollectionToDatabase(
  collection: CalendarCollection
): Promise<CalendarCollection> {
  try {
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('collections')
      .insert([
        {
          guid: collection.guid,
          name: collection.name,
          description: collection.description,
          sources: collection.calendars,
          created_at: collection.createdAt,
          updated_at: collection.updatedAt || collection.createdAt,
        },
      ])
      .select()
      .single()

    if (error) {
      console.error('Supabase insert error:', error)
      throw error
    }

    console.log('Successfully saved to Supabase:', data)
    return collection
  } catch (error) {
    console.error('Database save failed, falling back to memory:', error)
    // Fallback to in-memory storage
    initializeStorage()
    globalThis.calendarCollections.push(collection)
    return collection
  }
}

/**
 * Get all collections from Supabase with fallback to memory
 */
async function getAllCollectionsFromDatabase(): Promise<CalendarCollection[]> {
  try {
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('collections')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    // Transform database records to expected format
    return data.map(record => ({
      guid: record.guid,
      name: record.name,
      description: record.description,
      calendars: record.sources || [],
      createdAt: record.created_at,
      updatedAt: record.updated_at,
    }))
  } catch {
    // Fallback to in-memory storage
    initializeStorage()
    return globalThis.calendarCollections || []
  }
}

/**
 * GET /api/collections - Get all calendar collections
 */
export async function GET() {
  try {
    const collections = await getAllCollectionsFromDatabase()
    return NextResponse.json(collections)
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch collections' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/collections - Create new calendar collection
 */
export async function POST(request: NextRequest) {
  try {
    initializeStorage()

    const body: CreateCollectionRequest = await request.json()

    // Basic validation
    if (!body.name) {
      return NextResponse.json(
        { error: 'Collection name is required' },
        { status: 400 }
      )
    }

    if (
      !body.calendars ||
      !Array.isArray(body.calendars) ||
      body.calendars.length === 0
    ) {
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

      // Validate calendar URL (lenient mode for development)
      const validationResult = await validateCalendarUrl(calendarData.url)
      if (!validationResult.isValid) {
        // For server errors (5xx), add as warning but allow creation
        if (validationResult.statusCode && validationResult.statusCode >= 500) {
          // Log warning but continue - server might be temporarily down
          console.warn(
            `Warning for ${calendarData.name}: ${validationResult.error}`
          )
        } else {
          // For other errors (invalid URL, 4xx), still block creation
          validationErrors.push(
            `Calendar ${i + 1} (${calendarData.name}): ${validationResult.error}`
          )
          continue
        }
      }

      const normalizedUrl = normalizeCalendarUrl(calendarData.url)

      const processedCalendar: CalendarSource = {
        id: i + 1, // Temporary ID for the collection context
        url: normalizedUrl,
        name: calendarData.name,
        color: calendarData.color || '#3b82f6',
        enabled: calendarData.enabled !== false,
        createdAt: new Date().toISOString(),
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

    // Create new collection
    const newCollection: CalendarCollection = {
      guid: generateGuid(),
      name: body.name,
      calendars: processedCalendars,
      createdAt: new Date().toISOString(),
    }

    // Add description only if provided
    if (body.description) {
      newCollection.description = body.description
    }

    // Save to database with fallback to memory
    const savedCollection = await saveCollectionToDatabase(newCollection)

    return NextResponse.json(savedCollection, { status: 201 })
  } catch (error) {
    console.error('Error creating collection:', error)
    return NextResponse.json(
      { error: 'Failed to create collection' },
      { status: 500 }
    )
  }
}
