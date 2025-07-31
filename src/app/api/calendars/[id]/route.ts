import { NextRequest, NextResponse } from 'next/server'
import { CalendarSource } from '../../../../types/calendar'
import {
  validateCalendarUrl,
  normalizeCalendarUrl,
} from '../../../../lib/calendar-utils'

// This will be replaced with proper persistence later
declare global {
  var calendars: CalendarSource[]
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params
    const id = parseInt(idParam)
    const calendar = globalThis.calendars?.find(c => c.id === id)

    if (!calendar) {
      return NextResponse.json({ error: 'Calendar not found' }, { status: 404 })
    }

    return NextResponse.json(calendar)
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch calendar' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params
    const id = parseInt(idParam)
    const body = await request.json()

    if (!globalThis.calendars) {
      globalThis.calendars = []
    }

    const calendarIndex = globalThis.calendars.findIndex(c => c.id === id)

    if (calendarIndex === -1) {
      return NextResponse.json({ error: 'Calendar not found' }, { status: 404 })
    }

    const currentCalendar = globalThis.calendars[calendarIndex]

    if (!currentCalendar) {
      return NextResponse.json({ error: 'Calendar not found' }, { status: 404 })
    }

    // If URL is being updated, validate it
    if (body.url && body.url !== currentCalendar.url) {
      const validationResult = await validateCalendarUrl(body.url)
      if (!validationResult.isValid) {
        return NextResponse.json(
          {
            error: 'Invalid calendar URL',
            details: validationResult.error,
            warnings: validationResult.warnings,
          },
          { status: 400 }
        )
      }

      const normalizedUrl = normalizeCalendarUrl(body.url)

      // Check for duplicate URLs (excluding current calendar)
      const existingCalendar = globalThis.calendars.find(
        cal => cal.url === normalizedUrl && cal.id !== id
      )
      if (existingCalendar) {
        return NextResponse.json(
          { error: 'Calendar URL already exists' },
          { status: 409 }
        )
      }

      body.url = normalizedUrl
    }

    const updatedCalendar: CalendarSource = {
      ...currentCalendar,
      ...body,
      id, // Ensure ID doesn't change
      updatedAt: new Date().toISOString(),
    }

    globalThis.calendars[calendarIndex] = updatedCalendar

    return NextResponse.json(updatedCalendar)
  } catch {
    return NextResponse.json(
      { error: 'Failed to update calendar' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params
    const id = parseInt(idParam)

    if (!globalThis.calendars) {
      globalThis.calendars = []
    }

    const calendarIndex = globalThis.calendars.findIndex(c => c.id === id)

    if (calendarIndex === -1) {
      return NextResponse.json({ error: 'Calendar not found' }, { status: 404 })
    }

    globalThis.calendars.splice(calendarIndex, 1)

    return NextResponse.json({ message: 'Calendar deleted successfully' })
  } catch {
    return NextResponse.json(
      { error: 'Failed to delete calendar' },
      { status: 500 }
    )
  }
}
