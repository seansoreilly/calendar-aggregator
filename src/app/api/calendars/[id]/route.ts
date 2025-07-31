import { NextRequest, NextResponse } from 'next/server'
import { CalendarSource } from '@/types/calendar'

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

    const updatedCalendar = {
      ...globalThis.calendars[calendarIndex],
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
