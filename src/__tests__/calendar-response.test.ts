import { describe, it, expect } from 'vitest'
import {
  parseCalendarTimeout,
  createCalendarHeadResponse,
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

function makeCollection(overrides: Partial<CalendarCollection> = {}): CalendarCollection {
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
    expect(parseCalendarTimeout(makeUrl(String(MIN_TIMEOUT_MS)))).toBe(MIN_TIMEOUT_MS)
  })

  it('accepts the exact MAX boundary', () => {
    expect(parseCalendarTimeout(makeUrl(String(MAX_TIMEOUT_MS)))).toBe(MAX_TIMEOUT_MS)
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
