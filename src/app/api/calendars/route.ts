import { NextRequest, NextResponse } from 'next/server'
import { CalendarSource } from '@/types/calendar'
import { validateCalendarUrl, normalizeCalendarUrl } from '@/lib/calendar-utils'

// This will be replaced with proper persistence later
declare global {
  var calendars: CalendarSource[]
  var nextId: number
}

export async function GET() {
  try {
    if (!globalThis.calendars) {
      globalThis.calendars = []
    }
    return NextResponse.json({
      calendars: globalThis.calendars,
      count: globalThis.calendars.length,
    })
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch calendars' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Initialize globals if needed
    if (!globalThis.calendars) {
      globalThis.calendars = []
    }
    if (!globalThis.nextId) {
      globalThis.nextId = 1
    }

    // Basic validation
    if (!body.url || !body.name) {
      return NextResponse.json(
        { error: 'URL and name are required' },
        { status: 400 }
      )
    }

    // Validate calendar URL
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

    // Check for duplicate URLs
    const existingCalendar = globalThis.calendars.find(
      cal => cal.url === normalizedUrl
    )
    if (existingCalendar) {
      return NextResponse.json(
        { error: 'Calendar URL already exists' },
        { status: 409 }
      )
    }

    const newCalendar: CalendarSource = {
      id: globalThis.nextId++,
      url: normalizedUrl,
      name: body.name,
      color: body.color || '#3b82f6',
      enabled: body.enabled !== false,
      createdAt: new Date().toISOString(),
      syncStatus: 'idle',
    }

    globalThis.calendars.push(newCalendar)

    return NextResponse.json(newCalendar, { status: 201 })
  } catch {
    return NextResponse.json(
      { error: 'Failed to create calendar' },
      { status: 500 }
    )
  }
}
