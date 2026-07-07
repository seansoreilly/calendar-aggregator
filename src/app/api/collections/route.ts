import { NextRequest, NextResponse } from 'next/server'
import { CreateCollectionRequest } from '../../../types/calendar'
import {
  saveCollectionToDatabase,
  findCollectionByGuidInDatabase,
} from '../../../lib/supabase'
import { validateCreateCollectionRequest } from '../../../lib/validation'
import {
  errorResponse,
  isCalendarCollectionError,
  toCalendarCollectionError,
} from '../../../lib/errors'
import {
  buildCollectionRecord,
  generateGuid,
  processCalendarInputs,
} from '../../../lib/collection-service'
import {
  clientKeyFromHeaders,
  collectionCreateLimiter,
  rateLimitResponse,
} from '../../../lib/rate-limit'

/**
 * POST /api/collections - Create new calendar collection
 */
export async function POST(request: NextRequest) {
  try {
    // Best-effort per-IP rate limit on the (write-heavy) create path.
    const rate = collectionCreateLimiter.check(
      clientKeyFromHeaders(request.headers)
    )
    if (!rate.allowed) {
      return rateLimitResponse(rate)
    }

    const body: CreateCollectionRequest = await request.json()

    // Validate request using structured validation
    try {
      validateCreateCollectionRequest(body)
    } catch (error) {
      if (isCalendarCollectionError(error)) {
        return errorResponse(error)
      }
      throw error
    }

    const { calendars: processedCalendars, validationErrors } =
      await processCalendarInputs(body.calendars)

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
      collectionId = body.customId.toLowerCase()
    } else {
      // Generate UUID as fallback
      collectionId = generateGuid()
    }

    const newCollection = buildCollectionRecord(
      body,
      collectionId,
      processedCalendars
    )

    // Save to database with fallback to memory
    const savedCollection = await saveCollectionToDatabase(newCollection)

    return NextResponse.json(savedCollection, { status: 201 })
  } catch (error) {
    console.error('Error creating collection:', error)

    // Use structured error handling
    if (isCalendarCollectionError(error)) {
      return errorResponse(error)
    }

    // Handle unexpected errors
    const appError = toCalendarCollectionError(error, 'create_collection')
    return errorResponse(appError, false)
  }
}
