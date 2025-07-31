import { NextRequest, NextResponse } from 'next/server'
import { CalendarSource } from '@/types/calendar'

// In-memory storage for now (will be replaced with proper persistence later)
const calendars: CalendarSource[] = []
let nextId = 1

export async function GET() {
  try {
    return NextResponse.json({
      calendars,
      count: calendars.length,
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

    // Basic validation
    if (!body.url || !body.name) {
      return NextResponse.json(
        { error: 'URL and name are required' },
        { status: 400 }
      )
    }

    const newCalendar = {
      id: nextId++,
      url: body.url,
      name: body.name,
      color: body.color || '#3b82f6',
      enabled: body.enabled !== false,
      createdAt: new Date().toISOString(),
    }

    calendars.push(newCalendar)

    return NextResponse.json(newCalendar, { status: 201 })
  } catch {
    return NextResponse.json(
      { error: 'Failed to create calendar' },
      { status: 500 }
    )
  }
}
