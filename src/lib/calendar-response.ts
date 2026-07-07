import { createHash } from 'node:crypto'
import { NextResponse } from 'next/server'
import { CalendarCollection, CombineResult } from '../types/calendar'

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
