import { NextRequest, NextResponse } from 'next/server'
import { CalendarSource } from '../../../types/calendar'
import { fetchMultipleCalendars } from '../../../lib/calendar-fetcher'

// This will be replaced with proper persistence later
declare global {
  var calendars: CalendarSource[]
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { calendarIds } = body

    if (!globalThis.calendars) {
      globalThis.calendars = []
    }

    // Get calendars to sync
    let calendarsToSync: CalendarSource[]
    if (calendarIds && Array.isArray(calendarIds)) {
      // Sync specific calendars
      calendarsToSync = globalThis.calendars.filter(
        cal => calendarIds.includes(cal.id) && cal.enabled
      )
    } else {
      // Sync all enabled calendars
      calendarsToSync = globalThis.calendars.filter(cal => cal.enabled)
    }

    if (calendarsToSync.length === 0) {
      return NextResponse.json({
        status: 'completed',
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        calendars: 0,
        eventsProcessed: 0,
        errors: ['No enabled calendars found to sync'],
        calendarResults: [],
      })
    }

    const startedAt = new Date().toISOString()

    // Update calendar sync status to 'syncing'
    calendarsToSync.forEach(cal => {
      const calIndex = globalThis.calendars.findIndex(c => c.id === cal.id)
      if (calIndex !== -1 && globalThis.calendars[calIndex]) {
        globalThis.calendars[calIndex].syncStatus = 'syncing'
      }
    })

    // Fetch calendar events
    const fetchResults = await fetchMultipleCalendars(calendarsToSync, 15000)

    let totalEventsProcessed = 0
    const errors: string[] = []
    const calendarResults = fetchResults.map(result => {
      totalEventsProcessed += result.eventsCount

      // Update calendar sync status
      const calIndex = globalThis.calendars.findIndex(
        c => c.id === result.calendarId
      )
      if (calIndex !== -1 && globalThis.calendars[calIndex]) {
        globalThis.calendars[calIndex].syncStatus = result.success
          ? 'success'
          : 'error'
        globalThis.calendars[calIndex].lastSyncAt = result.fetchedAt
        if (!result.success && result.errors.length > 0 && result.errors[0]) {
          globalThis.calendars[calIndex].errorMessage = result.errors[0]
        } else {
          delete globalThis.calendars[calIndex].errorMessage
        }
      }

      if (!result.success) {
        errors.push(
          ...result.errors.map(err => `Calendar ${result.calendarId}: ${err}`)
        )
      }

      return {
        calendarId: result.calendarId,
        status: result.success ? 'completed' : 'error',
        startedAt,
        completedAt: result.fetchedAt,
        eventsProcessed: result.eventsCount,
        eventsAdded: result.eventsCount, // For now, all events are "new"
        eventsUpdated: 0,
        eventsRemoved: 0,
        errors: result.errors,
      }
    })

    const completedAt = new Date().toISOString()
    const overallStatus =
      errors.length === 0
        ? 'completed'
        : errors.length < fetchResults.length
          ? 'partial'
          : 'failed'

    const syncResult = {
      status: overallStatus,
      startedAt,
      completedAt,
      calendars: calendarsToSync.length,
      eventsProcessed: totalEventsProcessed,
      errors,
      calendarResults,
    }

    return NextResponse.json(syncResult)
  } catch {
    return NextResponse.json(
      { error: 'Failed to sync calendars' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    if (!globalThis.calendars) {
      globalThis.calendars = []
    }

    // Get sync status from calendars
    const calendars = globalThis.calendars
    const syncStatuses = calendars.map(cal => ({
      calendarId: cal.id,
      name: cal.name,
      syncStatus: cal.syncStatus || 'idle',
      lastSyncAt: cal.lastSyncAt || null,
      errorMessage: cal.errorMessage || null,
    }))

    const hasAnySyncing = calendars.some(cal => cal.syncStatus === 'syncing')
    const lastSyncTimes = calendars
      .map(cal => cal.lastSyncAt)
      .filter(time => time)
      .sort()
    const lastSync =
      lastSyncTimes.length > 0 ? lastSyncTimes[lastSyncTimes.length - 1] : null

    return NextResponse.json({
      status: hasAnySyncing ? 'syncing' : 'idle',
      lastSync,
      calendars: syncStatuses,
      totalCalendars: calendars.length,
      enabledCalendars: calendars.filter(cal => cal.enabled).length,
    })
  } catch {
    return NextResponse.json(
      { error: 'Failed to get sync status' },
      { status: 500 }
    )
  }
}
