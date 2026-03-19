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

function buildCalendarHeaders(
  collection: CalendarCollection,
  combineResult: Pick<
    CombineResult,
    'eventsCount' | 'calendarsProcessed' | 'warnings'
  >
): HeadersInit {
  const enabledCalendarsCount = collection.calendars.filter(
    cal => cal.enabled
  ).length

  const headers: Record<string, string> = {
    'Content-Type': CALENDAR_CONTENT_TYPE,
    'Content-Disposition': `attachment; filename="${sanitizeFilename(collection.name)}.ics"`,
    'X-Calendar-Events-Count': combineResult.eventsCount.toString(),
    'X-Calendar-Sources-Processed': combineResult.calendarsProcessed.toString(),
    'X-Calendar-Sources-Total': enabledCalendarsCount.toString(),
    'Cache-Control': CALENDAR_CACHE_CONTROL,
  }

  if (combineResult.warnings.length > 0) {
    headers['X-Calendar-Warnings'] = JSON.stringify(combineResult.warnings)
  }

  return headers
}

export function parseCalendarTimeout(requestUrl: string): number | null {
  const url = new URL(requestUrl)
  const timeoutParam = url.searchParams.get('timeout')
  const timeoutMs = timeoutParam
    ? parseInt(timeoutParam, 10)
    : DEFAULT_TIMEOUT_MS

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
  const headers = buildCalendarHeaders(collection, combineResult) as Record<
    string,
    string
  >
  headers['X-Calendar-Errors'] = JSON.stringify(combineResult.errors)

  return new NextResponse(combineResult.icalContent, {
    status: 206,
    headers,
  })
}

export function createCalendarHeadResponse(
  collection: CalendarCollection
): NextResponse {
  const enabledCalendarsCount = collection.calendars.filter(
    cal => cal.enabled
  ).length

  return new NextResponse(null, {
    status: 200,
    headers: {
      'Content-Type': CALENDAR_CONTENT_TYPE,
      'X-Collection-Name': collection.name,
      'X-Collection-Description': collection.description || '',
      'X-Calendar-Sources-Count': enabledCalendarsCount.toString(),
      'X-Collection-Created': collection.createdAt,
      'X-Collection-Updated': collection.updatedAt || collection.createdAt,
      'Cache-Control': CALENDAR_CACHE_CONTROL,
    },
  })
}
