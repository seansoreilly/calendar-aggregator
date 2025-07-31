import axios from 'axios'
import * as ical from 'node-ical'
import { CalendarEvent, CalendarSource, ICalEvent } from '../types/calendar'
import { normalizeCalendarUrl } from './calendar-utils'

/**
 * Fetch result interface
 */
export interface FetchResult {
  success: boolean
  calendarId: number
  events: CalendarEvent[]
  eventsCount: number
  errors: string[]
  warnings: string[]
  fetchedAt: string
  responseTime: number
}

/**
 * Converts an iCal event to our standardized CalendarEvent format
 */
function convertICalEvent(
  icalEvent: ICalEvent,
  calendarId: number
): CalendarEvent | null {
  try {
    if (!icalEvent.uid || !icalEvent.summary) {
      return null // Skip events without required fields
    }

    const startDate = icalEvent.start || icalEvent.dtstart
    const endDate = icalEvent.end || icalEvent.dtend

    if (!startDate) {
      return null // Skip events without start date
    }

    // Handle organizer field (can be string or object)
    let organizer: { name?: string; email?: string } | undefined
    if (icalEvent.organizer) {
      if (typeof icalEvent.organizer === 'string') {
        organizer = { email: icalEvent.organizer }
      } else if (
        typeof icalEvent.organizer === 'object' &&
        'val' in icalEvent.organizer
      ) {
        organizer = { email: icalEvent.organizer.val }
      }
    }

    // Handle attendees (can be various formats)
    let attendees: Array<{
      name?: string
      email?: string
      status?: 'accepted' | 'declined' | 'tentative' | 'needs-action'
    }> = []
    if (icalEvent.attendee) {
      if (typeof icalEvent.attendee === 'string') {
        attendees = [{ email: icalEvent.attendee }]
      } else if (Array.isArray(icalEvent.attendee)) {
        attendees = icalEvent.attendee.map(att => {
          if (typeof att === 'string') {
            return { email: att }
          } else if (typeof att === 'object' && 'val' in att) {
            return { email: att.val }
          }
          return { email: '' }
        })
      }
    }

    // Handle categories
    let categories: string[] = []
    if (icalEvent.categories) {
      if (typeof icalEvent.categories === 'string') {
        categories = [icalEvent.categories]
      } else if (Array.isArray(icalEvent.categories)) {
        categories = icalEvent.categories
      }
    }

    const event: CalendarEvent = {
      id: icalEvent.uid,
      title: icalEvent.summary,
      start: startDate.toISOString(),
      end: endDate ? endDate.toISOString() : startDate.toISOString(),
      isAllDay: !icalEvent.start?.getHours && !icalEvent.dtstart?.getHours,
      isRecurring: !!icalEvent.rrule,
      status:
        (icalEvent.status as 'confirmed' | 'tentative' | 'cancelled') ||
        'confirmed',
      calendarId,
      sourceId: icalEvent.uid,
    }

    // Add optional properties only if they exist
    if (icalEvent.description) {
      event.description = icalEvent.description
    }
    if (icalEvent.location) {
      event.location = icalEvent.location
    }
    if (organizer) {
      event.organizer = organizer
    }
    if (attendees.length > 0) {
      event.attendees = attendees
    }
    if (icalEvent.rrule) {
      event.recurrenceRule = String(icalEvent.rrule)
    }
    if (categories.length > 0) {
      event.categories = categories
    }
    if (icalEvent.url) {
      event.url = icalEvent.url
    }

    return event
  } catch (error) {
    console.error('Error converting iCal event:', error)
    return null
  }
}

/**
 * Fetches and parses calendar data from a single calendar source
 */
export async function fetchCalendarEvents(
  calendar: CalendarSource,
  timeoutMs: number = 10000
): Promise<FetchResult> {
  const startTime = Date.now()
  const result: FetchResult = {
    success: false,
    calendarId: calendar.id,
    events: [],
    eventsCount: 0,
    errors: [],
    warnings: [],
    fetchedAt: new Date().toISOString(),
    responseTime: 0,
  }

  try {
    const normalizedUrl = normalizeCalendarUrl(calendar.url)

    // Fetch calendar data
    const response = await axios.get(normalizedUrl, {
      timeout: timeoutMs,
      headers: {
        'User-Agent': 'Calendar-Aggregator/1.0',
        Accept: 'text/calendar, text/plain, */*',
      },
      maxRedirects: 5,
    })

    result.responseTime = Date.now() - startTime

    // Check if we got calendar data
    if (!response.data || typeof response.data !== 'string') {
      result.errors.push('No calendar data received')
      return result
    }

    if (!response.data.includes('BEGIN:VCALENDAR')) {
      result.errors.push('Response does not contain valid calendar data')
      return result
    }

    // Parse iCal data
    let calendarData: Record<string, unknown>
    try {
      calendarData = ical.parseICS(response.data)
    } catch (parseError) {
      result.errors.push(`Failed to parse calendar data: ${parseError}`)
      return result
    }

    // Convert events
    const events: CalendarEvent[] = []
    let skippedEvents = 0

    for (const [_key, component] of Object.entries(calendarData)) {
      if (
        component &&
        typeof component === 'object' &&
        'type' in component &&
        component.type === 'VEVENT'
      ) {
        const event = convertICalEvent(component as ICalEvent, calendar.id)
        if (event) {
          events.push(event)
        } else {
          skippedEvents++
        }
      }
    }

    if (skippedEvents > 0) {
      result.warnings.push(
        `Skipped ${skippedEvents} events due to missing required fields`
      )
    }

    result.events = events
    result.eventsCount = events.length
    result.success = true

    return result
  } catch (error) {
    result.responseTime = Date.now() - startTime

    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNABORTED') {
        result.errors.push(`Request timeout after ${timeoutMs}ms`)
      } else if (error.code === 'ENOTFOUND') {
        result.errors.push('Calendar server not found')
      } else if (error.code === 'ECONNREFUSED') {
        result.errors.push('Connection refused by calendar server')
      } else if (error.response) {
        result.errors.push(
          `HTTP ${error.response.status}: ${error.response.statusText}`
        )
      } else {
        result.errors.push(error.message || 'Network error')
      }
    } else {
      result.errors.push('Unknown error occurred while fetching calendar')
    }

    return result
  }
}

/**
 * Fetches events from multiple calendar sources concurrently
 */
export async function fetchMultipleCalendars(
  calendars: CalendarSource[],
  timeoutMs: number = 10000
): Promise<FetchResult[]> {
  const enabledCalendars = calendars.filter(cal => cal.enabled)

  if (enabledCalendars.length === 0) {
    return []
  }

  // Fetch all calendars concurrently
  const fetchPromises = enabledCalendars.map(calendar =>
    fetchCalendarEvents(calendar, timeoutMs)
  )

  try {
    const results = await Promise.allSettled(fetchPromises)

    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value
      } else {
        // Create error result for rejected promises
        const calendar = enabledCalendars[index]
        return {
          success: false,
          calendarId: calendar?.id || 0,
          events: [],
          eventsCount: 0,
          errors: [`Promise rejected: ${result.reason}`],
          warnings: [],
          fetchedAt: new Date().toISOString(),
          responseTime: 0,
        }
      }
    })
  } catch (error) {
    // This shouldn't happen with Promise.allSettled, but handle it just in case
    return enabledCalendars.map(calendar => ({
      success: false,
      calendarId: calendar.id,
      events: [],
      eventsCount: 0,
      errors: [`Unexpected error: ${error}`],
      warnings: [],
      fetchedAt: new Date().toISOString(),
      responseTime: 0,
    }))
  }
}
