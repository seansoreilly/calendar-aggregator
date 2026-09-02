import {
  CalendarDateRange,
  CalendarSource,
  CombineResult,
} from '../types/calendar'
import { fetchCalendarBody } from './calendar-fetch'

/** Maximum total events across all sources before truncation. */
const MAX_TOTAL_EVENTS = 50_000

const MS_PER_DAY = 86_400_000

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
 * Strict property lookup: matches only `NAME:` or `NAME;PARAMS:` lines, so
 * DTSTART never matches DTSTAMP. Returns the raw parameter string and value.
 */
function extractProperty(
  blockContent: string,
  propertyName: string
): { params: string; value: string } | null {
  for (const line of blockContent.split(/\r?\n/)) {
    if (!line.startsWith(propertyName)) continue
    const next = line.charAt(propertyName.length)
    if (next !== ':' && next !== ';') continue
    const colonIdx = line.indexOf(':')
    if (colonIdx === -1) continue
    return {
      params: line.substring(propertyName.length, colonIdx),
      value: line.substring(colonIdx + 1).trim(),
    }
  }
  return null
}

interface ICalInstant {
  date: Date
  isDateOnly: boolean
}

/**
 * Parse an iCal DATE (`20240601`) or DATE-TIME (`20240601T090000[Z]`) value.
 * Floating and TZID-qualified times are treated as UTC — an accepted
 * approximation for day-granularity filtering. Null when malformed.
 */
function parseICalDate(value: string): ICalInstant | null {
  const match = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})Z?)?$/.exec(
    value
  )
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const isDateOnly = match[4] === undefined
  const date = new Date(
    Date.UTC(
      year,
      month - 1,
      day,
      Number(match[4] ?? 0),
      Number(match[5] ?? 0),
      Number(match[6] ?? 0)
    )
  )
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null
  }
  return { date, isDateOnly }
}

/** Parse an iCal DURATION (`P1D`, `PT1H30M`, `P2W`) to milliseconds; null if malformed. */
function parseICalDuration(value: string): number | null {
  const match =
    /^([+-])?P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/.exec(
      value
    )
  if (!match || value.length < 3) return null
  const sign = match[1] === '-' ? -1 : 1
  const ms =
    Number(match[2] ?? 0) * 7 * MS_PER_DAY +
    Number(match[3] ?? 0) * MS_PER_DAY +
    Number(match[4] ?? 0) * 3_600_000 +
    Number(match[5] ?? 0) * 60_000 +
    Number(match[6] ?? 0) * 1000
  return sign * ms
}

interface EventBounds {
  start: Date
  end: Date
}

/**
 * Resolve an event's [start, end) window from DTSTART and DTEND / DURATION.
 * With neither DTEND nor DURATION, RFC 5545 defaults apply: one day for DATE
 * values, zero length otherwise. Null when DTSTART is absent or unparseable.
 */
function eventBounds(event: string): EventBounds | null {
  const dtstart = extractProperty(event, 'DTSTART')
  const start = dtstart ? parseICalDate(dtstart.value) : null
  if (!start) return null

  const dtend = extractProperty(event, 'DTEND')
  const end = dtend ? parseICalDate(dtend.value)?.date : undefined
  if (end) return { start: start.date, end }

  const duration = extractProperty(event, 'DURATION')
  const durationMs = duration ? parseICalDuration(duration.value) : null
  if (durationMs !== null) {
    return {
      start: start.date,
      end: new Date(start.date.getTime() + durationMs),
    }
  }

  const defaultMs = start.isDateOnly ? MS_PER_DAY : 0
  return { start: start.date, end: new Date(start.date.getTime() + defaultMs) }
}

/** Half-open overlap test; a zero-length event exactly at `lower` counts. */
function overlapsRange(bounds: EventBounds, range: CalendarDateRange): boolean {
  if (range.upper && bounds.start >= range.upper) return false
  if (range.lower && bounds.end <= range.lower && bounds.start < range.lower) {
    return false
  }
  return true
}

/**
 * A recurring master is kept unless it clearly cannot produce an occurrence in
 * the window: it starts after `upper`, or its RRULE UNTIL (plus one
 * occurrence's duration) falls before `lower`. Series are selected, not
 * trimmed — the client still expands the RRULE. COUNT and RDATE are not
 * evaluated (fail open).
 */
function recurringSeriesMayOverlap(
  event: string,
  bounds: EventBounds,
  range: CalendarDateRange
): boolean {
  if (range.upper && bounds.start >= range.upper) return false
  if (!range.lower) return true

  const rrule = extractProperty(event, 'RRULE')
  const untilValue = rrule
    ? /(?:^|;)UNTIL=([^;]+)/.exec(rrule.value)?.[1]
    : undefined
  const until = untilValue ? parseICalDate(untilValue) : null
  if (!until) return true

  const occurrenceMs = Math.max(
    bounds.end.getTime() - bounds.start.getTime(),
    until.isDateOnly ? MS_PER_DAY : 0
  )
  return until.date.getTime() + occurrenceMs > range.lower.getTime()
}

/**
 * Drop VEVENT blocks that cannot fall inside `range`. Two passes: plain events
 * and recurring masters first, then overrides (RECURRENCE-ID), which follow
 * their master when it was kept — so a moved occurrence never resurfaces at
 * its original slot — and are otherwise judged on their own dates. Events
 * without a parseable DTSTART are always kept.
 */
function filterEventsByDateRange(
  events: string[],
  range: CalendarDateRange
): string[] {
  if (!range.lower && !range.upper) return events

  const keptMasterUids = new Set<string>()
  const decisions: (boolean | 'override')[] = events.map(event => {
    if (extractProperty(event, 'RECURRENCE-ID')) return 'override'
    const bounds = eventBounds(event)
    if (!bounds) return true
    const isRecurring = extractProperty(event, 'RRULE') !== null
    const keep = isRecurring
      ? recurringSeriesMayOverlap(event, bounds, range)
      : overlapsRange(bounds, range)
    if (keep && isRecurring) {
      const uid = extractPropertyValue(event, 'UID')
      if (uid !== null) keptMasterUids.add(uid)
    }
    return keep
  })

  return events.filter((event, index) => {
    const decision = decisions[index]
    if (decision !== 'override') return decision
    const uid = extractPropertyValue(event, 'UID')
    if (uid !== null && keptMasterUids.has(uid)) return true
    const bounds = eventBounds(event)
    return bounds === null || overlapsRange(bounds, range)
  })
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
 * Fetch calendar data as raw iCal content via the shared, size-capped fetch
 * stack (`fetchCalendarBody` — SSRF-hardened, byte-capped, iCal sanity-checked).
 * The `signal` is forwarded so that the combiner's per-source AbortController
 * timeout cancels the underlying request promptly.
 */
async function fetchRawICalContent(
  calendar: CalendarSource,
  signal: AbortSignal
): Promise<FetchResult> {
  const result = await fetchCalendarBody(calendar.url, { signal })

  if (!result.ok) {
    return { success: false, error: result.error }
  }

  return { success: true, content: result.body }
}

/**
 * Combine multiple iCal feeds into a single unified iCal output.
 *
 * Contract (see `result.status` — the tri-state the route branches on):
 *  - `status === 'ok'`      ⟺  every enabled source fetched OK
 *    (`success === true`, `errors.length === 0`) → route serves HTTP 200.
 *  - `status === 'partial'` ⟺  `calendarsProcessed > 0` with a non-empty
 *    `icalContent` and at least one failed source → route serves HTTP 206.
 *  - `status === 'failed'`  ⟺  `calendarsProcessed === 0` (no source could be
 *    fetched) → route serves HTTP 503.
 * `success` is retained for compatibility and equals `status === 'ok'`.
 *
 * `dateRange`, when given, drops events outside the window after dedup and
 * before the size cap (see `filterEventsByDateRange`).
 */
export async function combineICalFeeds(
  calendars: CalendarSource[],
  timeoutMs: number = 15000,
  dateRange?: CalendarDateRange
): Promise<CombineResult> {
  const result: CombineResult = {
    success: false,
    status: 'failed',
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

  // Optional date-range filter (query params on the feed URL).
  const filteredEvents = dateRange
    ? filterEventsByDateRange(uniqueEvents, dateRange)
    : uniqueEvents

  // Total event cap: drop excess events and warn rather than ballooning memory.
  let cappedEvents = filteredEvents
  if (filteredEvents.length > MAX_TOTAL_EVENTS) {
    cappedEvents = filteredEvents.slice(0, MAX_TOTAL_EVENTS)
    result.warnings.push(
      `Event cap reached: truncated to ${MAX_TOTAL_EVENTS} events (${filteredEvents.length} total)`
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
  // At this point calendarsProcessed > 0 (the zero case returned earlier), so
  // the outcome is either a clean 'ok' or a 'partial' (some sources errored).
  result.success = result.errors.length === 0
  result.status = result.success ? 'ok' : 'partial'

  return result
}
