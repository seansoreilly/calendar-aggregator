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
 * GET /api/collections - List all calendar collections
 */
export async function GET() {
  try {
    initializeStorage()

    return NextResponse.json({
      collections: globalThis.calendarCollections,
      count: globalThis.calendarCollections.length,
    })
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

    // Check for duplicate collection names
    const existingCollection = globalThis.calendarCollections.find(
      col => col.name.toLowerCase() === body.name.toLowerCase()
    )
    if (existingCollection) {
      return NextResponse.json(
        { error: 'Collection name already exists' },
        { status: 409 }
      )
    }

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

    globalThis.calendarCollections.push(newCollection)

    return NextResponse.json(newCollection, { status: 201 })
  } catch (error) {
    console.error('Error creating collection:', error)
    return NextResponse.json(
      { error: 'Failed to create collection' },
      { status: 500 }
    )
  }
}
