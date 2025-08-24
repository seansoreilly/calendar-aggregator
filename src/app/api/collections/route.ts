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
import {
  saveCollectionToDatabase,
  getAllCollectionsFromDatabase,
  findCollectionByGuidInDatabase,
} from '../../../lib/supabase'
import {
  validateCreateCollectionRequest,
  sanitizeCollectionName,
  sanitizeCollectionDescription,
} from '../../../lib/validation'
import {
  isCalendarCollectionError,
  toCalendarCollectionError,
} from '../../../lib/errors'

/**
 * Generate a cryptographically secure GUID using Web Crypto API
 */
function generateGuid(): string {
  // Use built-in crypto for UUID generation
  if (
    typeof globalThis !== 'undefined' &&
    'crypto' in globalThis &&
    globalThis.crypto.randomUUID
  ) {
    return globalThis.crypto.randomUUID()
  }

  // Fallback implementation for environments without crypto.randomUUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

/**
 * GET /api/collections - Get all calendar collections
 */
export async function GET() {
  try {
    const collections = await getAllCollectionsFromDatabase()
    return NextResponse.json(collections)
  } catch (error) {
    console.error('Error fetching collections:', error)
    const appError = toCalendarCollectionError(error, 'fetch_collections')
    return NextResponse.json(
      {
        error: appError.message,
        code: appError.code,
      },
      { status: appError.statusCode }
    )
  }
}

/**
 * POST /api/collections - Create new calendar collection
 */
export async function POST(request: NextRequest) {
  try {
    const body: CreateCollectionRequest = await request.json()

    // Validate request using structured validation
    try {
      validateCreateCollectionRequest(body)
    } catch (error) {
      if (isCalendarCollectionError(error)) {
        return NextResponse.json(
          {
            error: error.message,
            code: error.code,
            details: error.details,
          },
          { status: error.statusCode }
        )
      }
      throw error
    }

    // Process and validate calendars with URL validation
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

    // Handle custom ID or generate UUID
    let collectionId: string

    if (body.customId) {
      // Check for collision with existing collections (case-insensitive)
      const existingCollection = await findCollectionByGuidInDatabase(
        body.customId.toLowerCase()
      )
      if (existingCollection) {
        return NextResponse.json(
          {
            error: 'A collection with this custom ID already exists',
            code: 'COLLECTION_EXISTS',
          },
          { status: 409 }
        )
      }
      collectionId = body.customId
    } else {
      // Generate UUID as fallback
      collectionId = generateGuid()
    }

    // Create new collection with sanitized data
    const now = new Date().toISOString()
    const newCollection: CalendarCollection = {
      guid: collectionId,
      name: sanitizeCollectionName(body.name),
      calendars: processedCalendars,
      createdAt: now,
      updatedAt: now,
    }

    // Add description only if provided after sanitization
    const sanitizedDescription = sanitizeCollectionDescription(body.description)
    if (sanitizedDescription) {
      newCollection.description = sanitizedDescription
    }

    // Save to database with fallback to memory
    const savedCollection = await saveCollectionToDatabase(newCollection)

    return NextResponse.json(savedCollection, { status: 201 })
  } catch (error) {
    console.error('Error creating collection:', error)

    // Use structured error handling
    if (isCalendarCollectionError(error)) {
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
          details: error.details,
        },
        { status: error.statusCode }
      )
    }

    // Handle unexpected errors
    const appError = toCalendarCollectionError(error, 'create_collection')
    return NextResponse.json(
      {
        error: appError.message,
        code: appError.code,
      },
      { status: appError.statusCode }
    )
  }
}
