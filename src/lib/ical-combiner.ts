import { CalendarSource, CombineResult } from '../types/calendar'
import { safeFetch } from './safe-fetch'

/**
 * Maximum bytes accepted from a single calendar source. Sized as an anti-DoS
 * ceiling that comfortably exceeds a legitimate MAX_TOTAL_EVENTS-sized calendar
 * (~10-20MB), so normal large calendars are not rejected.
 */
const MAX_SOURCE_BYTES = 25_000_000

/** Maximum total events across all sources before truncation. */
const MAX_TOTAL_EVENTS = 50_000

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
 * Extract RECURRENCE-ID from an event string. Returns empty string when absent.
 */
function extractEventRecurrenceId(eventContent: string): string {
  const lines = eventContent.split(/\r?\n/)
  for (const line of lines) {
    // RECURRENCE-ID may carry parameters, e.g. RECURRENCE-ID;TZID=...:value
    if (line.startsWith('RECURRENCE-ID')) {
      const colonIdx = line.indexOf(':')
      if (colonIdx !== -1) {
        return line.substring(colonIdx + 1).trim()
      }
    }
  }
  return ''
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
 * Deduplicate events by the composite key UID + RECURRENCE-ID.
 *
 * - Events with the same UID and the same RECURRENCE-ID (including both absent)
 *   are exact duplicates — first occurrence wins.
 * - Events with the same UID but different RECURRENCE-ID values are recurring-
 *   event overrides and must be kept distinct.
 * - Events without a UID are kept unconditionally (shouldn't occur in well-formed
 *   iCal, but we preserve them rather than silently dropping them).
 */
function deduplicateEvents(events: string[]): string[] {
  const seenKeys = new Set<string>()
  const uniqueEvents: string[] = []

  for (const event of events) {
    const uid = extractEventUID(event)
    if (uid === null) {
      // Keep events without UIDs
      uniqueEvents.push(event)
      continue
    }
    const recurrenceId = extractEventRecurrenceId(event)
    const key = `${uid}\x00${recurrenceId}`
    if (!seenKeys.has(key)) {
      seenKeys.add(key)
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
 * Fetch calendar data as raw iCal content via safeFetch (SSRF-hardened).
 * The `signal` is forwarded to the underlying fetch call so that
 * AbortController-based timeouts cancel the request promptly.
 */
async function fetchRawICalContent(
  calendar: CalendarSource,
  signal: AbortSignal
): Promise<{ success: boolean; content?: string; error?: string }> {
  try {
    const response = await safeFetch(calendar.url, {
      headers: {
        'User-Agent': 'Calendar-Aggregator/1.0',
        Accept: 'text/calendar, text/plain, */*',
      },
      signal,
    })

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
      }
    }

    const raw = await response.text()

    // Size guard: reject excessively large responses before further processing.
    if (raw.length > MAX_SOURCE_BYTES) {
      return {
        success: false,
        error: `Response too large (${raw.length} bytes, limit ${MAX_SOURCE_BYTES})`,
      }
    }

    if (!raw.includes('BEGIN:VCALENDAR')) {
      return {
        success: false,
        error: 'Response does not contain valid iCal data',
      }
    }

    return {
      success: true,
      content: raw,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Combine multiple iCal feeds into a single unified iCal output.
 *
 * Contract:
 *  - `result.success === true`  ⟺  every enabled source fetched OK
 *    (`result.errors.length === 0`).
 *  - `result.success === false` + `calendarsProcessed > 0` + non-empty
 *    `icalContent`  ⟹  PARTIAL (route serves HTTP 206).
 *  - `calendarsProcessed === 0`  ⟹  total failure (route serves HTTP 503).
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

  // Fetch raw iCal content from all calendars, each with its own AbortController
  // so the timeout actually cancels the underlying network request.
  const fetchPromises = enabledCalendars.map(async calendar => {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)

    try {
      return await fetchRawICalContent(calendar, controller.signal)
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    } finally {
      clearTimeout(timer)
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

  // Count successful fetches as the single source of truth.
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

  // Total event cap: drop excess events and warn rather than ballooning memory.
  let cappedEvents = uniqueEvents
  if (uniqueEvents.length > MAX_TOTAL_EVENTS) {
    cappedEvents = uniqueEvents.slice(0, MAX_TOTAL_EVENTS)
    result.warnings.push(
      `Event cap reached: truncated to ${MAX_TOTAL_EVENTS} events (${uniqueEvents.length} total)`
    )
  }

  // Build the combined iCal content.
  const icalParts: string[] = []

  // Add header
  icalParts.push(generateICalHeader())

  // Add timezones first (they need to be defined before events that reference them)
  if (uniqueTimezones.length > 0) {
    icalParts.push(...uniqueTimezones)
  }

  // Add events
  if (cappedEvents.length > 0) {
    icalParts.push(...cappedEvents)
  }

  // Add footer
  icalParts.push(generateICalFooter())

  result.icalContent = icalParts.join('\r\n')
  result.eventsCount = cappedEvents.length

  // success === true only when every enabled source was fetched without error.
  result.success = result.errors.length === 0

  return result
}
