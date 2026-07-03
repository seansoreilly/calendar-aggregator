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
 * Extract complete component blocks (BEGIN:<name> to END:<name>, inclusive)
 * from raw iCal content. Handles nested blocks of the same component by
 * tracking depth, returning only the outermost blocks.
 */
function extractComponentBlocks(
  icalContent: string,
  componentName: 'VEVENT' | 'VTIMEZONE'
): string[] {
  const beginMarker = `BEGIN:${componentName}`
  const endMarker = `END:${componentName}`
  const blocks: string[] = []
  const lines = icalContent.split(/\r?\n/)

  let currentBlock: string[] = []
  let depth = 0

  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed === beginMarker) {
      if (depth === 0) {
        currentBlock = [line]
      } else {
        currentBlock.push(line)
      }
      depth++
    } else if (trimmed === endMarker && depth > 0) {
      depth--
      currentBlock.push(line)
      if (depth === 0) {
        blocks.push(currentBlock.join('\r\n'))
        currentBlock = []
      }
    } else if (depth > 0) {
      currentBlock.push(line)
    }
  }

  return blocks
}

/**
 * Extract the value of a property from a component block.
 * With `allowParams`, lines like `NAME;PARAM=X:value` also match; otherwise
 * only bare `NAME:value` lines do. Returns null when the property is absent.
 */
function extractPropertyValue(
  blockContent: string,
  propertyName: string,
  allowParams = false
): string | null {
  const bareMarker = `${propertyName}:`
  const lines = blockContent.split(/\r?\n/)
  for (const line of lines) {
    if (
      allowParams ? line.startsWith(propertyName) : line.startsWith(bareMarker)
    ) {
      const colonIdx = line.indexOf(':')
      if (colonIdx !== -1) {
        return line.substring(colonIdx + 1).trim()
      }
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
    const uid = extractPropertyValue(event, 'UID')
    if (uid === null) {
      // Keep events without UIDs
      uniqueEvents.push(event)
      continue
    }
    // RECURRENCE-ID may carry parameters, e.g. RECURRENCE-ID;TZID=...:value
    const recurrenceId =
      extractPropertyValue(event, 'RECURRENCE-ID', true) ?? ''
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
    const tzid = extractPropertyValue(timezone, 'TZID')
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

type FetchResult =
  | { success: true; content: string }
  | { success: false; error: string }

/**
 * Fetch calendar data as raw iCal content via safeFetch (SSRF-hardened).
 * The `signal` is forwarded to the underlying fetch call so that
 * AbortController-based timeouts cancel the request promptly.
 */
async function fetchRawICalContent(
  calendar: CalendarSource,
  signal: AbortSignal
): Promise<FetchResult> {
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
  const fetchPromises = enabledCalendars.map(
    async (calendar): Promise<FetchResult> => {
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
    }
  )

  const fetchResults = await Promise.allSettled(fetchPromises)

  // Collect all events and timezones
  const allEvents: string[] = []
  const allTimezones: string[] = []

  fetchResults.forEach((fetchResult, index) => {
    const calendar = enabledCalendars[index]

    if (fetchResult.status === 'fulfilled' && fetchResult.value.success) {
      // Extract events and timezones from this calendar
      const events = extractComponentBlocks(fetchResult.value.content, 'VEVENT')
      const timezones = extractComponentBlocks(
        fetchResult.value.content,
        'VTIMEZONE'
      )

      allEvents.push(...events)
      allTimezones.push(...timezones)

      if (events.length === 0) {
        result.warnings.push(
          `No events found in calendar: ${calendar?.name || 'Unknown'}`
        )
      }
    } else {
      const errorMessage =
        fetchResult.status === 'fulfilled' && !fetchResult.value.success
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
