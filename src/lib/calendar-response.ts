import { NextResponse } from 'next/server'
import { CalendarCollection, CombineResult } from '../types/calendar'

const CALENDAR_CONTENT_TYPE = 'text/calendar; charset=utf-8'
const CALENDAR_CACHE_CONTROL = 'public, max-age=300'
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
  return new NextResponse(combineResult.icalContent, {
    status: 200,
    headers: buildCalendarHeaders(collection, combineResult),
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

  return new NextResponse(combineResult.icalContent, {
    status: 206,
    headers,
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
