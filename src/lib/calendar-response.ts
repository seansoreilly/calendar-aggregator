import { createHash } from 'node:crypto'
import { NextResponse } from 'next/server'
import {
  CalendarCollection,
  CalendarDateRange,
  CombineResult,
} from '../types/calendar'

const CALENDAR_CONTENT_TYPE = 'text/calendar; charset=utf-8'
const CALENDAR_CACHE_CONTROL = 'public, max-age=300'

/**
 * Compute a strong ETag (RFC 7232) for iCal content: a quoted sha-256 hex
 * digest of the body. Deterministic for identical output, so a client can send
 * it back via If-None-Match to skip re-downloading unchanged feeds.
 */
export function computeICalETag(icalContent: string): string {
  const hash = createHash('sha256').update(icalContent, 'utf8').digest('hex')
  return `"${hash}"`
}
const MIN_TIMEOUT_MS = 1000
const MAX_TIMEOUT_MS = 30000
const DEFAULT_TIMEOUT_MS = 15000

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9-_]/g, '-')
}

function sanitizeHeaderValue(v: string): string {
  return v.replace(/[\r\n\t\x00-\x1f\x7f]/g, '')
}

function countEnabledCalendars(collection: CalendarCollection): number {
  return collection.calendars.filter(cal => cal.enabled).length
}

function buildCalendarHeaders(
  collection: CalendarCollection,
  combineResult: Pick<
    CombineResult,
    'eventsCount' | 'calendarsProcessed' | 'warnings'
  >
): Record<string, string> {
  const enabledCalendarsCount = countEnabledCalendars(collection)

  const headers: Record<string, string> = {
    'Content-Type': CALENDAR_CONTENT_TYPE,
    'Content-Disposition': `attachment; filename="${sanitizeFilename(collection.name)}.ics"`,
    'X-Calendar-Events-Count': combineResult.eventsCount.toString(),
    'X-Calendar-Sources-Processed': combineResult.calendarsProcessed.toString(),
    'X-Calendar-Sources-Total': enabledCalendarsCount.toString(),
    'Cache-Control': CALENDAR_CACHE_CONTROL,
  }

  if (combineResult.warnings.length > 0) {
    headers['X-Calendar-Warnings'] = sanitizeHeaderValue(
      JSON.stringify(combineResult.warnings)
    )
  }

  return headers
}

export function parseCalendarTimeout(requestUrl: string): number | null {
  const url = new URL(requestUrl)
  const timeoutParam = url.searchParams.get('timeout')

  if (!timeoutParam) {
    return DEFAULT_TIMEOUT_MS
  }

  if (!/^\d+$/.test(timeoutParam)) {
    return null
  }

  const timeoutMs = parseInt(timeoutParam, 10)

  if (timeoutMs < MIN_TIMEOUT_MS || timeoutMs > MAX_TIMEOUT_MS) {
    return null
  }

  return timeoutMs
}

const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/
const RELATIVE_SPEC_RE = /^(\d{1,3})([dwmy])$/
const MS_PER_DAY = 86_400_000

/** Parse `YYYY-MM-DD` to UTC midnight; null for malformed or impossible dates. */
function parseIsoDate(value: string): Date | null {
  const match = ISO_DATE_RE.exec(value)
  if (!match) {
    return null
  }
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(Date.UTC(year, month - 1, day))
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null
  }
  return date
}

/** Add calendar months in UTC, clamping to the last day of the target month. */
function addUtcMonths(date: Date, months: number): Date {
  const result = new Date(date.getTime())
  const dayOfMonth = result.getUTCDate()
  result.setUTCDate(1)
  result.setUTCMonth(result.getUTCMonth() + months)
  const daysInTargetMonth = new Date(
    Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)
  ).getUTCDate()
  result.setUTCDate(Math.min(dayOfMonth, daysInTargetMonth))
  return result
}

/**
 * Shift `now` by a relative spec such as `2w` or `3m`.
 * `direction` is -1 for `past`, +1 for `future`. Null when malformed or zero.
 */
function shiftByRelativeSpec(
  now: Date,
  spec: string,
  direction: 1 | -1
): Date | null {
  const match = RELATIVE_SPEC_RE.exec(spec)
  if (!match) {
    return null
  }
  const amount = Number(match[1]) * direction
  if (amount === 0) {
    return null
  }
  switch (match[2]) {
    case 'd':
      return new Date(now.getTime() + amount * MS_PER_DAY)
    case 'w':
      return new Date(now.getTime() + amount * 7 * MS_PER_DAY)
    case 'm':
      return addUtcMonths(now, amount)
    case 'y':
      return addUtcMonths(now, amount * 12)
    default:
      return null
  }
}

/**
 * Parse the optional date-filter query params on a feed URL:
 *   start / end   — `YYYY-MM-DD`, inclusive UTC calendar days
 *   past / future — `<n><d|w|m|y>` relative to `now` (e.g. past=2w, future=3m)
 * Each bound is resolved independently; an explicit start/end wins over
 * past/future for the same bound, so any combination is allowed.
 *
 * Returns `undefined` when no filter params are present (no filtering),
 * `null` when any supplied param is invalid or the window is empty.
 */
export function parseCalendarDateRange(
  requestUrl: string,
  now: Date = new Date()
): CalendarDateRange | null | undefined {
  const params = new URL(requestUrl).searchParams
  const start = params.get('start')
  const end = params.get('end')
  const past = params.get('past')
  const future = params.get('future')

  if (start === null && end === null && past === null && future === null) {
    return undefined
  }

  const startDate = start !== null ? parseIsoDate(start) : undefined
  const endDate = end !== null ? parseIsoDate(end) : undefined
  const pastDate =
    past !== null ? shiftByRelativeSpec(now, past, -1) : undefined
  const futureDate =
    future !== null ? shiftByRelativeSpec(now, future, 1) : undefined

  if (
    startDate === null ||
    endDate === null ||
    pastDate === null ||
    futureDate === null
  ) {
    return null
  }

  const lower = startDate ?? pastDate
  // `end` is an inclusive day, so the exclusive upper bound is the next midnight.
  const upper = endDate ? new Date(endDate.getTime() + MS_PER_DAY) : futureDate

  if (lower && upper && lower.getTime() >= upper.getTime()) {
    return null
  }

  const range: CalendarDateRange = {}
  if (lower) range.lower = lower
  if (upper) range.upper = upper
  return range
}

export function createCalendarSuccessResponse(
  collection: CalendarCollection,
  combineResult: Pick<
    CombineResult,
    'icalContent' | 'eventsCount' | 'calendarsProcessed' | 'warnings'
  >
): NextResponse {
  const headers = buildCalendarHeaders(collection, combineResult)
  headers['ETag'] = computeICalETag(combineResult.icalContent)

  return new NextResponse(combineResult.icalContent, {
    status: 200,
    headers,
  })
}

export function createCalendarPartialResponse(
  collection: CalendarCollection,
  combineResult: Pick<
    CombineResult,
    'icalContent' | 'eventsCount' | 'calendarsProcessed' | 'warnings' | 'errors'
  >
): NextResponse {
  const headers = buildCalendarHeaders(collection, combineResult)
  headers['X-Calendar-Errors'] = JSON.stringify(combineResult.errors)
  headers['ETag'] = computeICalETag(combineResult.icalContent)

  return new NextResponse(combineResult.icalContent, {
    status: 206,
    headers,
  })
}

/**
 * 304 Not Modified for a matched If-None-Match. Empty body; echoes the same
 * ETag and Cache-Control the 200/206 would have carried so the client keeps
 * its cached copy valid.
 *
 * Note: the upstream sources are still fetched and combined server-side to
 * derive the ETag — the 304 saves the client re-downloading and re-parsing the
 * (unchanged) feed body, not the server-side fetch cost.
 */
export function createCalendarNotModifiedResponse(etag: string): NextResponse {
  return new NextResponse(null, {
    status: 304,
    headers: {
      ETag: etag,
      'Cache-Control': CALENDAR_CACHE_CONTROL,
    },
  })
}

export function createCalendarHeadResponse(
  collection: CalendarCollection
): NextResponse {
  const enabledCalendarsCount = countEnabledCalendars(collection)

  return new NextResponse(null, {
    status: 200,
    headers: {
      'Content-Type': CALENDAR_CONTENT_TYPE,
      'X-Collection-Name': sanitizeHeaderValue(collection.name),
      'X-Collection-Description': sanitizeHeaderValue(
        collection.description || ''
      ),
      'X-Calendar-Sources-Count': enabledCalendarsCount.toString(),
      'X-Collection-Created': sanitizeHeaderValue(collection.createdAt),
      'X-Collection-Updated': sanitizeHeaderValue(
        collection.updatedAt || collection.createdAt
      ),
      'Cache-Control': CALENDAR_CACHE_CONTROL,
    },
  })
}
