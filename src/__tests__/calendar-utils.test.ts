import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  validateCalendarUrl,
  normalizeCalendarUrl,
  buildCalendarSource,
} from '../lib/calendar-utils'
import { countVevents, fetchCalendarBody } from '../lib/calendar-fetch'

describe('normalizeCalendarUrl', () => {
  it('converts webcal:// to https://', () => {
    expect(normalizeCalendarUrl('webcal://example.com/cal.ics')).toBe(
      'https://example.com/cal.ics'
    )
  })

  it('leaves http URLs untouched', () => {
    expect(normalizeCalendarUrl('http://example.com/cal.ics')).toBe(
      'http://example.com/cal.ics'
    )
  })

  it('leaves https URLs untouched', () => {
    expect(normalizeCalendarUrl('https://example.com/cal.ics')).toBe(
      'https://example.com/cal.ics'
    )
  })
})

describe('buildCalendarSource', () => {
  it('assigns sequential id from index', () => {
    const source = buildCalendarSource(
      { url: 'https://example.com/cal.ics', name: 'Cal' },
      0
    )
    expect(source.id).toBe(1)
  })

  it('applies default color when not provided', () => {
    const source = buildCalendarSource(
      { url: 'https://example.com/cal.ics', name: 'Cal' },
      0
    )
    expect(source.color).toBe('#3b82f6')
  })

  it('applies default enabled=true when not provided', () => {
    const source = buildCalendarSource(
      { url: 'https://example.com/cal.ics', name: 'Cal' },
      0
    )
    expect(source.enabled).toBe(true)
  })

  it('respects explicit enabled=false', () => {
    const source = buildCalendarSource(
      { url: 'https://example.com/cal.ics', name: 'Cal', enabled: false },
      0
    )
    expect(source.enabled).toBe(false)
  })

  it('sets syncStatus to idle', () => {
    const source = buildCalendarSource(
      { url: 'https://example.com/cal.ics', name: 'Cal' },
      0
    )
    expect(source.syncStatus).toBe('idle')
  })

  it('normalizes webcal:// urls', () => {
    const source = buildCalendarSource(
      { url: 'webcal://example.com/cal.ics', name: 'Cal' },
      0
    )
    expect(source.url).toBe('https://example.com/cal.ics')
  })

  it('preserves explicit color', () => {
    const source = buildCalendarSource(
      { url: 'https://example.com/cal.ics', name: 'Cal', color: '#ef4444' },
      2
    )
    expect(source.color).toBe('#ef4444')
    expect(source.id).toBe(3)
  })
})

describe('validateCalendarUrl', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('rejects an empty url without calling fetch', async () => {
    const result = await validateCalendarUrl('')
    expect(result).toEqual({ isValid: false, error: 'URL is required' })
    expect(fetch).not.toHaveBeenCalled()
  })

  it('rejects a non-string url without calling fetch', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await validateCalendarUrl(undefined as any)
    expect(result).toEqual({ isValid: false, error: 'URL is required' })
    expect(fetch).not.toHaveBeenCalled()
  })

  it('rejects an invalid URL format', async () => {
    const result = await validateCalendarUrl('not-a-url')
    expect(result.isValid).toBe(false)
    expect(result.error).toBe('Invalid URL format')
  })

  it('accepts a valid iCal response', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(
        'BEGIN:VCALENDAR\r\nBEGIN:VEVENT\r\nUID:a\r\nEND:VEVENT\r\nEND:VCALENDAR',
        { status: 200, headers: { 'content-type': 'text/calendar' } }
      )
    )

    const result = await validateCalendarUrl('https://example.com/cal.ics')

    expect(result.isValid).toBe(true)
    expect(result.eventCount).toBe(1)
    expect(result.statusCode).toBe(200)
  })

  it('reports a 4xx as access denied', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response('', { status: 404, statusText: 'Not Found' })
    )

    const result = await validateCalendarUrl('https://example.com/cal.ics')

    expect(result.isValid).toBe(false)
    expect(result.statusCode).toBe(404)
    expect(result.error).toContain('Access denied')
  })

  it('reports a 5xx as a server error', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response('', { status: 503, statusText: 'Service Unavailable' })
    )

    const result = await validateCalendarUrl('https://example.com/cal.ics')

    expect(result.isValid).toBe(false)
    expect(result.statusCode).toBe(503)
    expect(result.error).toContain('Server error')
  })

  it('rejects a non-iCal response', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response('<html>', {
        status: 200,
        headers: { 'content-type': 'text/html' },
      })
    )

    const result = await validateCalendarUrl('https://example.com/cal.ics')

    expect(result.isValid).toBe(false)
    expect(result.error).toContain('does not appear to contain calendar data')
  })

  it('reports a timeout', async () => {
    const timeoutError = new Error('t')
    timeoutError.name = 'TimeoutError'
    vi.mocked(fetch).mockRejectedValue(timeoutError)

    const result = await validateCalendarUrl('https://example.com/cal.ics')

    expect(result.isValid).toBe(false)
    expect(result.error).toContain('timeout')
  })
})

describe('fetchCalendarBody size cap', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('rejects a body larger than the configured maxBytes', async () => {
    const oversizedBody = 'BEGIN:VCALENDAR' + 'A'.repeat(200)
    vi.mocked(fetch).mockResolvedValue(
      new Response(oversizedBody, {
        status: 200,
        headers: { 'content-type': 'text/calendar' },
      })
    )

    const result = await fetchCalendarBody('https://example.com/cal.ics', {
      maxBytes: 100,
    })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(/too large/i.test(result.error)).toBe(true)
    }
  })
})

describe('countVevents', () => {
  it('counts line-anchored BEGIN:VEVENT markers', () => {
    const body = [
      'BEGIN:VCALENDAR',
      'BEGIN:VEVENT',
      'UID:a',
      'END:VEVENT',
      'BEGIN:VEVENT',
      'UID:b',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n')

    expect(countVevents(body)).toBe(2)
  })

  it('returns 0 when there are no events', () => {
    const body = 'BEGIN:VCALENDAR\r\nEND:VCALENDAR'
    expect(countVevents(body)).toBe(0)
  })

  it('does not count the substring inside a property value', () => {
    const body = [
      'BEGIN:VCALENDAR',
      'BEGIN:VEVENT',
      'UID:a',
      'SUMMARY:Contains BEGIN:VEVENT as text',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n')

    expect(countVevents(body)).toBe(1)
  })
})
