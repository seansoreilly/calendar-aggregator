import { CalendarSource, CombineResult } from '../types/calendar'

/**
 * Generate standard iCal header
 */
function generateICalHeader(): string {
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Calendar Aggregator//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ].join('\r\n')
}

/**
 * Generate standard iCal footer
 */
function generateICalFooter(): string {
  return 'END:VCALENDAR'
}

/**
 * Extract events from raw iCal content
 * Returns array of event strings (including BEGIN:VEVENT to END:VEVENT)
 */
function extractEventsFromICal(icalContent: string): string[] {
  const events: string[] = []
  const lines = icalContent.split(/\r?\n/)

  let currentEvent: string[] = []
  let inEvent = false

  for (const line of lines) {
    if (line.trim() === 'BEGIN:VEVENT') {
      inEvent = true
      currentEvent = [line]
    } else if (line.trim() === 'END:VEVENT' && inEvent) {
      currentEvent.push(line)
      events.push(currentEvent.join('\r\n'))
      currentEvent = []
      inEvent = false
    } else if (inEvent) {
      currentEvent.push(line)
    }
  }

  return events
}

/**
 * Extract timezone information from raw iCal content
 * Returns array of timezone strings (including BEGIN:VTIMEZONE to END:VTIMEZONE)
 */
function extractTimezonesFromICal(icalContent: string): string[] {
  const timezones: string[] = []
  const lines = icalContent.split(/\r?\n/)

  let currentTimezone: string[] = []
  let inTimezone = false
  let timezoneDepth = 0

  for (const line of lines) {
    if (line.trim() === 'BEGIN:VTIMEZONE') {
      if (!inTimezone) {
        inTimezone = true
        currentTimezone = [line]
        timezoneDepth = 1
      } else {
        timezoneDepth++
        currentTimezone.push(line)
      }
    } else if (line.trim() === 'END:VTIMEZONE' && inTimezone) {
      timezoneDepth--
      currentTimezone.push(line)
      if (timezoneDepth === 0) {
        timezones.push(currentTimezone.join('\r\n'))
        currentTimezone = []
        inTimezone = false
      }
    } else if (inTimezone) {
      currentTimezone.push(line)
    }
  }

  return timezones
}

/**
 * Extract UID from an event string
 */
function extractEventUID(eventContent: string): string | null {
  const lines = eventContent.split(/\r?\n/)
  for (const line of lines) {
    if (line.startsWith('UID:')) {
      return line.substring(4).trim()
    }
  }
  return null
}

/**
 * Extract TZID from a timezone string
 */
function extractTimezoneID(timezoneContent: string): string | null {
  const lines = timezoneContent.split(/\r?\n/)
  for (const line of lines) {
    if (line.startsWith('TZID:')) {
      return line.substring(5).trim()
    }
  }
  return null
}

/**
 * Deduplicate events by UID (keeps the first occurrence)
 */
function deduplicateEvents(events: string[]): string[] {
  const seenUIDs = new Set<string>()
  const uniqueEvents: string[] = []

  for (const event of events) {
    const uid = extractEventUID(event)
    if (uid && !seenUIDs.has(uid)) {
      seenUIDs.add(uid)
      uniqueEvents.push(event)
    } else if (!uid) {
      // Keep events without UIDs (shouldn't happen in well-formed iCal)
      uniqueEvents.push(event)
    }
  }

  return uniqueEvents
}

/**
 * Deduplicate timezones by TZID (keeps the first occurrence)
 */
function deduplicateTimezones(timezones: string[]): string[] {
  const seenTZIDs = new Set<string>()
  const uniqueTimezones: string[] = []

  for (const timezone of timezones) {
    const tzid = extractTimezoneID(timezone)
    if (tzid && !seenTZIDs.has(tzid)) {
      seenTZIDs.add(tzid)
      uniqueTimezones.push(timezone)
    } else if (!tzid) {
      // Keep timezones without TZIDs (shouldn't happen)
      uniqueTimezones.push(timezone)
    }
  }

  return uniqueTimezones
}

/**
 * Fetch calendar data as raw iCal content
 */
async function fetchRawICalContent(
  calendar: CalendarSource
): Promise<{ success: boolean; content?: string; error?: string }> {
  try {
    const response = await fetch(calendar.url, {
      headers: {
        'User-Agent': 'Calendar-Aggregator/1.0',
        Accept: 'text/calendar, text/plain, */*',
      },
    })

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
      }
    }

    const content = await response.text()

    if (!content.includes('BEGIN:VCALENDAR')) {
      return {
        success: false,
        error: 'Response does not contain valid iCal data',
      }
    }

    return {
      success: true,
      content,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Combine multiple iCal feeds into a single unified iCal output
 * This function fetches raw iCal data directly and combines at the iCal level
 */
export async function combineICalFeeds(
  calendars: CalendarSource[],
  timeoutMs: number = 15000
): Promise<CombineResult> {
  const result: CombineResult = {
    success: false,
    icalContent: '',
    eventsCount: 0,
    calendarsProcessed: 0,
    errors: [],
    warnings: [],
  }

  if (!calendars || calendars.length === 0) {
    result.errors.push('No calendars provided')
    return result
  }

  const enabledCalendars = calendars.filter(cal => cal.enabled)

  if (enabledCalendars.length === 0) {
    result.errors.push('No enabled calendars found')
    return result
  }

  // Fetch raw iCal content from all calendars
  const fetchPromises = enabledCalendars.map(async calendar => {
    const timeoutPromise = new Promise<{ success: boolean; error: string }>(
      (_, reject) => {
        setTimeout(
          () => reject(new Error(`Timeout after ${timeoutMs}ms`)),
          timeoutMs
        )
      }
    )

    const fetchPromise = fetchRawICalContent(calendar)

    try {
      return await Promise.race([fetchPromise, timeoutPromise])
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  })

  const fetchResults = await Promise.allSettled(fetchPromises)

  // Collect all events and timezones
  const allEvents: string[] = []
  const allTimezones: string[] = []

  fetchResults.forEach((fetchResult, index) => {
    const calendar = enabledCalendars[index]

    if (
      fetchResult.status === 'fulfilled' &&
      fetchResult.value.success &&
      'content' in fetchResult.value &&
      fetchResult.value.content
    ) {
      result.calendarsProcessed++

      // Extract events and timezones from this calendar
      const events = extractEventsFromICal(fetchResult.value.content)
      const timezones = extractTimezonesFromICal(fetchResult.value.content)

      allEvents.push(...events)
      allTimezones.push(...timezones)

      if (events.length === 0) {
        result.warnings.push(
          `No events found in calendar: ${calendar?.name || 'Unknown'}`
        )
      }
    } else {
      const errorMessage =
        fetchResult.status === 'fulfilled'
          ? fetchResult.value.error || 'Unknown error'
          : 'Promise rejected'

      result.errors.push(
        `Failed to fetch calendar "${calendar?.name || 'Unknown'}": ${errorMessage}`
      )
    }
  })

  // Count successful fetches
  result.calendarsProcessed = fetchResults.filter(
    r => r.status === 'fulfilled' && r.value.success
  ).length

  if (result.calendarsProcessed === 0) {
    result.errors.push('No calendars could be fetched successfully')
    return result
  }

  // Deduplicate events and timezones
  const uniqueEvents = deduplicateEvents(allEvents)
  const uniqueTimezones = deduplicateTimezones(allTimezones)

  const duplicateEvents = allEvents.length - uniqueEvents.length
  if (duplicateEvents > 0) {
    result.warnings.push(`Removed ${duplicateEvents} duplicate events`)
  }

  // Build the combined iCal content
  const icalParts: string[] = []

  // Add header
  icalParts.push(generateICalHeader())

  // Add timezones first (they need to be defined before events that reference them)
  if (uniqueTimezones.length > 0) {
    icalParts.push(...uniqueTimezones)
  }

  // Add events
  if (uniqueEvents.length > 0) {
    icalParts.push(...uniqueEvents)
  }

  // Add footer
  icalParts.push(generateICalFooter())

  result.icalContent = icalParts.join('\r\n')
  result.eventsCount = uniqueEvents.length
  result.success = true

  return result
}
