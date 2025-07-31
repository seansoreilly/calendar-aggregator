import { NextRequest, NextResponse } from 'next/server'
import { CalendarSource } from '../../../../../types/calendar'
import { testCalendarConnection } from '../../../../../lib/calendar-utils'

// This will be replaced with proper persistence later
declare global {
  var calendars: CalendarSource[]
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params
    const id = parseInt(idParam)

    if (!globalThis.calendars) {
      globalThis.calendars = []
    }

    const calendar = globalThis.calendars.find(c => c.id === id)

    if (!calendar) {
      return NextResponse.json({ error: 'Calendar not found' }, { status: 404 })
    }

    // Test the calendar connection
    const testResult = await testCalendarConnection(calendar.url)

    return NextResponse.json({
      calendarId: id,
      calendarName: calendar.name,
      url: calendar.url,
      testResult,
    })
  } catch {
    return NextResponse.json(
      { error: 'Failed to test calendar connection' },
      { status: 500 }
    )
  }
}
