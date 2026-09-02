import { describe, it, expect } from 'vitest'
import { createHash } from 'node:crypto'
import {
  parseCalendarTimeout,
  parseCalendarDateRange,
  createCalendarHeadResponse,
  createCalendarNotModifiedResponse,
  computeICalETag,
} from '../lib/calendar-response'
import { CalendarCollection } from '../types/calendar'

const DEFAULT_TIMEOUT_MS = 15000
const MIN_TIMEOUT_MS = 1000
const MAX_TIMEOUT_MS = 30000

function makeUrl(timeout?: string): string {
  const base = 'https://example.com/api/calendar/test'
  if (timeout === undefined) return base
  return `${base}?timeout=${timeout}`
}

function makeCollection(
  overrides: Partial<CalendarCollection> = {}
): CalendarCollection {
  return {
    guid: 'test-guid',
    name: 'Test Collection',
    description: 'A test collection',
    calendars: [],
    createdAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('parseCalendarTimeout', () => {
  it('returns the value for a valid numeric string', () => {
    expect(parseCalendarTimeout(makeUrl('5000'))).toBe(5000)
  })

  it('returns DEFAULT_TIMEOUT_MS when timeout param is absent', () => {
    expect(parseCalendarTimeout(makeUrl())).toBe(DEFAULT_TIMEOUT_MS)
  })

  it('returns null when timeout is below MIN', () => {
    expect(parseCalendarTimeout(makeUrl(String(MIN_TIMEOUT_MS - 1)))).toBeNull()
  })

  it('returns null when timeout is above MAX', () => {
    expect(parseCalendarTimeout(makeUrl(String(MAX_TIMEOUT_MS + 1)))).toBeNull()
  })

  it('returns null for non-numeric string "abc"', () => {
    expect(parseCalendarTimeout(makeUrl('abc'))).toBeNull()
  })

  it('returns null for negative number string', () => {
    expect(parseCalendarTimeout(makeUrl('-5000'))).toBeNull()
  })

  it('returns null for float string (not all-digit)', () => {
    expect(parseCalendarTimeout(makeUrl('5000.5'))).toBeNull()
  })

  it('accepts the exact MIN boundary', () => {
    expect(parseCalendarTimeout(makeUrl(String(MIN_TIMEOUT_MS)))).toBe(
      MIN_TIMEOUT_MS
    )
  })

  it('accepts the exact MAX boundary', () => {
    expect(parseCalendarTimeout(makeUrl(String(MAX_TIMEOUT_MS)))).toBe(
      MAX_TIMEOUT_MS
    )
  })
})

describe('parseCalendarDateRange', () => {
  // Sunday 31 March 2024, midday UTC — month-end so clamping is exercised.
  const NOW = new Date('2024-03-31T12:00:00.000Z')

  function rangeUrl(params: Record<string, string>): string {
    const url = new URL('https://example.com/api/calendar/test')
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
    return url.toString()
  }

  function parse(params: Record<string, string>) {
    return parseCalendarDateRange(rangeUrl(params), NOW)
  }

  it('returns undefined when no filter params are present', () => {
    expect(parse({})).toBeUndefined()
    expect(parseCalendarDateRange(makeUrl('5000'), NOW)).toBeUndefined()
  })

  it('parses start as an inclusive UTC lower bound', () => {
    expect(parse({ start: '2024-06-01' })).toEqual({
      lower: new Date('2024-06-01T00:00:00.000Z'),
      upper: undefined,
    })
  })

  it('parses end as an inclusive day (exclusive upper bound is next midnight)', () => {
    expect(parse({ end: '2024-06-30' })).toEqual({
      lower: undefined,
      upper: new Date('2024-07-01T00:00:00.000Z'),
    })
  })

  it('accepts start === end as a single-day window', () => {
    expect(parse({ start: '2024-06-10', end: '2024-06-10' })).toEqual({
      lower: new Date('2024-06-10T00:00:00.000Z'),
      upper: new Date('2024-06-11T00:00:00.000Z'),
    })
  })

  it('parses past in days and weeks relative to now', () => {
    expect(parse({ past: '10d' })?.lower).toEqual(
      new Date('2024-03-21T12:00:00.000Z')
    )
    expect(parse({ past: '2w' })?.lower).toEqual(
      new Date('2024-03-17T12:00:00.000Z')
    )
  })

  it('parses future in months and years, clamping to month end', () => {
    // 31 March + 3 months → "31 June" does not exist → 30 June
    expect(parse({ future: '3m' })?.upper).toEqual(
      new Date('2024-06-30T12:00:00.000Z')
    )
    expect(parse({ future: '1y' })?.upper).toEqual(
      new Date('2025-03-31T12:00:00.000Z')
    )
  })

  it('clamps past months to month end (31 March − 1 month → 29 Feb 2024)', () => {
    expect(parse({ past: '1m' })?.lower).toEqual(
      new Date('2024-02-29T12:00:00.000Z')
    )
  })

  it('combines past and future into a window around now', () => {
    expect(parse({ past: '1w', future: '1w' })).toEqual({
      lower: new Date('2024-03-24T12:00:00.000Z'),
      upper: new Date('2024-04-07T12:00:00.000Z'),
    })
  })

  it('lets explicit start/end win over past/future for the same bound', () => {
    expect(parse({ start: '2024-01-01', past: '1w' })?.lower).toEqual(
      new Date('2024-01-01T00:00:00.000Z')
    )
    expect(parse({ end: '2024-12-31', future: '1w' })?.upper).toEqual(
      new Date('2025-01-01T00:00:00.000Z')
    )
  })

  it.each([
    ['start', '2024-13-01'],
    ['start', '2024-02-30'],
    ['start', '20240601'],
    ['start', '2024-6-1'],
    ['end', 'tomorrow'],
    ['past', '2x'],
    ['past', '0d'],
    ['past', 'w'],
    ['past', '2 w'],
    ['future', '-1d'],
    ['future', '1.5m'],
    ['future', '1000d'],
  ])('returns null for invalid %s=%s', (key, value) => {
    expect(parse({ [key]: value })).toBeNull()
  })

  it('returns null when start is after end', () => {
    expect(parse({ start: '2024-06-10', end: '2024-06-01' })).toBeNull()
  })

  it('returns null when an explicit start is after the computed future bound', () => {
    expect(parse({ start: '2030-01-01', future: '1w' })).toBeNull()
  })
})

describe('createCalendarHeadResponse', () => {
  it('does not throw when collection name contains CRLF injection', () => {
    const collection = makeCollection({
      name: 'Legit Name\r\nX-Injected: 1',
    })
    expect(() => createCalendarHeadResponse(collection)).not.toThrow()
  })

  it('strips CR and LF from X-Collection-Name header', () => {
    const collection = makeCollection({
      name: 'Legit Name\r\nX-Injected: 1',
    })
    const response = createCalendarHeadResponse(collection)
    const headerValue = response.headers.get('X-Collection-Name') ?? ''
    expect(headerValue).not.toContain('\r')
    expect(headerValue).not.toContain('\n')
  })

  it('strips CR and LF from X-Collection-Description header', () => {
    const collection = makeCollection({
      description: 'A description\r\nX-Injected: bad',
    })
    const response = createCalendarHeadResponse(collection)
    const headerValue = response.headers.get('X-Collection-Description') ?? ''
    expect(headerValue).not.toContain('\r')
    expect(headerValue).not.toContain('\n')
  })

  it('preserves safe characters in collection name', () => {
    const collection = makeCollection({ name: 'My Safe Collection' })
    const response = createCalendarHeadResponse(collection)
    expect(response.headers.get('X-Collection-Name')).toBe('My Safe Collection')
  })
})

describe('computeICalETag', () => {
  const ICAL = 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nEND:VCALENDAR'

  it('returns a quoted sha-256 hex digest of the content', () => {
    const expected = `"${createHash('sha256').update(ICAL, 'utf8').digest('hex')}"`
    expect(computeICalETag(ICAL)).toBe(expected)
  })

  it('is a strong validator (quoted, no weak W/ prefix)', () => {
    const etag = computeICalETag(ICAL)
    expect(etag.startsWith('"')).toBe(true)
    expect(etag.endsWith('"')).toBe(true)
    expect(etag.startsWith('W/')).toBe(false)
  })

  it('is deterministic for identical content', () => {
    expect(computeICalETag(ICAL)).toBe(computeICalETag(ICAL))
  })

  it('differs for different content', () => {
    expect(computeICalETag(ICAL)).not.toBe(computeICalETag(ICAL + '\r\n'))
  })
})

describe('createCalendarNotModifiedResponse', () => {
  it('returns 304 with an empty body and echoes the ETag + Cache-Control', async () => {
    const etag = computeICalETag('BEGIN:VCALENDAR\r\nEND:VCALENDAR')
    const response = createCalendarNotModifiedResponse(etag)

    expect(response.status).toBe(304)
    expect(response.headers.get('ETag')).toBe(etag)
    expect(response.headers.get('Cache-Control')).toBeTruthy()
    expect(await response.text()).toBe('')
  })
})
