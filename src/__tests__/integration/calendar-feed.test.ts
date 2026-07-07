import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, HEAD } from '../../app/api/calendar/[guid]/route'
import { CalendarCollection, CombineResult } from '../../types/calendar'
import { computeICalETag } from '../../lib/calendar-response'

vi.mock('../../lib/supabase', () => ({
  findCollectionByGuidInDatabase: vi.fn(),
}))

vi.mock('../../lib/ical-combiner', () => ({
  combineICalFeeds: vi.fn(),
}))

import { findCollectionByGuidInDatabase } from '../../lib/supabase'
import { combineICalFeeds } from '../../lib/ical-combiner'

const mockFind = vi.mocked(findCollectionByGuidInDatabase)
const mockCombine = vi.mocked(combineICalFeeds)

const BASE_COLLECTION: CalendarCollection = {
  guid: 'test-guid',
  name: 'My Calendar',
  description: 'Test collection',
  calendars: [
    {
      id: 1,
      url: 'https://example.com/cal.ics',
      name: 'Source 1',
      color: '#3b82f6',
      enabled: true,
      createdAt: new Date().toISOString(),
      syncStatus: 'idle',
    },
  ],
  createdAt: new Date().toISOString(),
}

const MOCK_ICAL = [
  'BEGIN:VCALENDAR',
  'VERSION:2.0',
  'PRODID:-//Test//Test//EN',
  'BEGIN:VEVENT',
  'UID:event1@test',
  'SUMMARY:Test Event',
  'DTSTART:20240101T090000Z',
  'DTEND:20240101T100000Z',
  'END:VEVENT',
  'END:VCALENDAR',
].join('\r\n')

function makeCombineResult(
  overrides: Partial<CombineResult> = {}
): CombineResult {
  return {
    success: true,
    status: 'ok',
    icalContent: MOCK_ICAL,
    eventsCount: 1,
    calendarsProcessed: 1,
    errors: [],
    warnings: [],
    ...overrides,
  }
}

function makeRequest(
  guid: string,
  searchParams?: Record<string, string>,
  headers?: Record<string, string>
): {
  request: NextRequest
  params: Promise<{ guid: string }>
} {
  const url = new URL(`http://localhost:3000/api/calendar/${guid}`)
  if (searchParams) {
    Object.entries(searchParams).forEach(([k, v]) => url.searchParams.set(k, v))
  }
  return {
    request: headers
      ? new NextRequest(url.toString(), { headers })
      : new NextRequest(url.toString()),
    params: Promise.resolve({ guid }),
  }
}

describe('GET /api/calendar/[guid]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('validation', () => {
    it('returns 400 when guid is empty', async () => {
      const { request, params } = makeRequest('')
      const response = await GET(request, { params })
      expect(response.status).toBe(400)
    })

    it('returns 400 for an invalid ID format', async () => {
      // Starts with dash — invalid custom ID
      const { request, params } = makeRequest('-bad-id')
      const response = await GET(request, { params })
      expect(response.status).toBe(400)
    })

    it('returns 400 when timeout is below minimum', async () => {
      mockFind.mockResolvedValue(BASE_COLLECTION)
      const { request, params } = makeRequest('test-collection', {
        timeout: '500',
      })
      const response = await GET(request, { params })
      expect(response.status).toBe(400)
      const body = await response.json()
      expect(body.error).toContain('Timeout')
    })

    it('returns 400 when timeout is above maximum', async () => {
      mockFind.mockResolvedValue(BASE_COLLECTION)
      const { request, params } = makeRequest('test-collection', {
        timeout: '99999',
      })
      const response = await GET(request, { params })
      expect(response.status).toBe(400)
    })
  })

  describe('collection lookup', () => {
    it('returns 404 when collection does not exist', async () => {
      mockFind.mockResolvedValue(null)
      const { request, params } = makeRequest('missing-collection')
      const response = await GET(request, { params })
      expect(response.status).toBe(404)
      const body = await response.json()
      expect(body.error).toContain('not found')
    })

    it('returns 404 when all calendars are disabled', async () => {
      mockFind.mockResolvedValue({
        ...BASE_COLLECTION,
        calendars: [{ ...BASE_COLLECTION.calendars[0], enabled: false }],
      })
      const { request, params } = makeRequest('test-collection')
      const response = await GET(request, { params })
      expect(response.status).toBe(404)
      const body = await response.json()
      expect(body.error).toContain('No enabled calendars')
    })
  })

  describe('successful feed', () => {
    it('returns 200 with text/calendar content type', async () => {
      mockFind.mockResolvedValue(BASE_COLLECTION)
      mockCombine.mockResolvedValue(makeCombineResult())

      const { request, params } = makeRequest('test-collection')
      const response = await GET(request, { params })

      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toContain('text/calendar')
      const body = await response.text()
      expect(body).toContain('BEGIN:VCALENDAR')
      expect(body).toContain('SUMMARY:Test Event')
    })

    it('sets Content-Disposition with sanitized collection name', async () => {
      mockFind.mockResolvedValue({
        ...BASE_COLLECTION,
        name: 'My Calendar & Events!',
      })
      mockCombine.mockResolvedValue(makeCombineResult())

      const { request, params } = makeRequest('test-collection')
      const response = await GET(request, { params })

      const disposition = response.headers.get('Content-Disposition')
      expect(disposition).toContain('attachment')
      expect(disposition).toContain('.ics')
      // Special chars replaced with dashes
      expect(disposition).not.toContain('&')
      expect(disposition).not.toContain('!')
    })

    it('sets event count and sources headers', async () => {
      mockFind.mockResolvedValue(BASE_COLLECTION)
      mockCombine.mockResolvedValue(makeCombineResult({ eventsCount: 5 }))

      const { request, params } = makeRequest('test-collection')
      const response = await GET(request, { params })

      expect(response.headers.get('X-Calendar-Events-Count')).toBe('5')
      expect(response.headers.get('X-Calendar-Sources-Processed')).toBe('1')
      expect(response.headers.get('X-Calendar-Sources-Total')).toBe('1')
    })

    it('sets warnings header when warnings are present', async () => {
      mockFind.mockResolvedValue(BASE_COLLECTION)
      mockCombine.mockResolvedValue(
        makeCombineResult({
          eventsCount: 0,
          warnings: ['No events found in calendar: Source 1'],
        })
      )

      const { request, params } = makeRequest('test-collection')
      const response = await GET(request, { params })

      expect(response.status).toBe(200)
      const warnings = response.headers.get('X-Calendar-Warnings')
      expect(warnings).toBeTruthy()
      expect(JSON.parse(warnings ?? '')).toContain(
        'No events found in calendar: Source 1'
      )
    })

    it('passes custom timeout to combineICalFeeds', async () => {
      mockFind.mockResolvedValue(BASE_COLLECTION)
      mockCombine.mockResolvedValue(makeCombineResult())

      const { request, params } = makeRequest('test-collection', {
        timeout: '5000',
      })
      await GET(request, { params })

      expect(mockCombine).toHaveBeenCalledWith(BASE_COLLECTION.calendars, 5000)
    })

    it('accepts UUID as guid', async () => {
      const uuid = '550e8400-e29b-41d4-a716-446655440000'
      mockFind.mockResolvedValue({ ...BASE_COLLECTION, guid: uuid })
      mockCombine.mockResolvedValue(makeCombineResult())

      const { request, params } = makeRequest(uuid)
      const response = await GET(request, { params })

      expect(response.status).toBe(200)
    })
  })

  describe('conditional GET (ETag / If-None-Match)', () => {
    it('sets a strong ETag matching the sha-256 of the body on 200', async () => {
      mockFind.mockResolvedValue(BASE_COLLECTION)
      mockCombine.mockResolvedValue(makeCombineResult())

      const { request, params } = makeRequest('test-collection')
      const response = await GET(request, { params })

      const etag = response.headers.get('ETag')
      expect(etag).toBe(computeICalETag(MOCK_ICAL))
      // Strong validator: quoted, no weak "W/" prefix.
      expect(etag?.startsWith('"')).toBe(true)
      expect(etag?.startsWith('W/')).toBe(false)
    })

    it('sets an ETag on 206 partial responses', async () => {
      mockFind.mockResolvedValue(BASE_COLLECTION)
      mockCombine.mockResolvedValue(
        makeCombineResult({
          success: false,
          status: 'partial',
          errors: ['Failed to fetch calendar "Source 2": timeout'],
        })
      )

      const { request, params } = makeRequest('test-collection')
      const response = await GET(request, { params })

      expect(response.status).toBe(206)
      expect(response.headers.get('ETag')).toBe(computeICalETag(MOCK_ICAL))
    })

    it('returns 304 with empty body when If-None-Match matches', async () => {
      mockFind.mockResolvedValue(BASE_COLLECTION)
      mockCombine.mockResolvedValue(makeCombineResult())

      const { request, params } = makeRequest('test-collection', undefined, {
        'If-None-Match': computeICalETag(MOCK_ICAL),
      })
      const response = await GET(request, { params })

      expect(response.status).toBe(304)
      expect(response.headers.get('ETag')).toBe(computeICalETag(MOCK_ICAL))
      expect(response.headers.get('Cache-Control')).toBeTruthy()
      const body = await response.text()
      expect(body).toBe('')
    })

    it('returns 200 with body when If-None-Match does not match', async () => {
      mockFind.mockResolvedValue(BASE_COLLECTION)
      mockCombine.mockResolvedValue(makeCombineResult())

      const { request, params } = makeRequest('test-collection', undefined, {
        'If-None-Match': '"stale-etag"',
      })
      const response = await GET(request, { params })

      expect(response.status).toBe(200)
      const body = await response.text()
      expect(body).toContain('BEGIN:VCALENDAR')
    })
  })

  describe('partial and total failure', () => {
    it('returns 206 with partial content when some calendars fail', async () => {
      mockFind.mockResolvedValue(BASE_COLLECTION)
      mockCombine.mockResolvedValue(
        makeCombineResult({
          success: false,
          status: 'partial',
          errors: ['Failed to fetch calendar "Source 2": timeout'],
        })
      )

      const { request, params } = makeRequest('test-collection')
      const response = await GET(request, { params })

      expect(response.status).toBe(206)
      expect(response.headers.get('Content-Type')).toContain('text/calendar')
      const errors = response.headers.get('X-Calendar-Errors')
      expect(JSON.parse(errors ?? '')).toHaveLength(1)
    })

    it('returns 503 when all calendars fail to fetch', async () => {
      mockFind.mockResolvedValue(BASE_COLLECTION)
      mockCombine.mockResolvedValue(
        makeCombineResult({
          success: false,
          status: 'failed',
          icalContent: '',
          eventsCount: 0,
          calendarsProcessed: 0,
          errors: ['Failed to fetch calendar "Source 1": Network error'],
        })
      )

      const { request, params } = makeRequest('test-collection')
      const response = await GET(request, { params })

      expect(response.status).toBe(503)
      const body = await response.json()
      expect(body.error).toContain('unavailable')
      expect(body.details).toBeUndefined()
    })
  })
})

describe('HEAD /api/calendar/[guid]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 200 with metadata headers when collection exists', async () => {
    mockFind.mockResolvedValue(BASE_COLLECTION)
    const { request, params } = makeRequest('test-collection')
    const response = await HEAD(request, { params })

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toContain('text/calendar')
    expect(response.headers.get('X-Collection-Name')).toBe('My Calendar')
    expect(response.headers.get('X-Calendar-Sources-Count')).toBe('1')
  })

  it('returns 404 when collection does not exist', async () => {
    mockFind.mockResolvedValue(null)
    const { request, params } = makeRequest('missing-collection')
    const response = await HEAD(request, { params })
    expect(response.status).toBe(404)
  })

  it('returns 404 when all calendars are disabled', async () => {
    mockFind.mockResolvedValue({
      ...BASE_COLLECTION,
      calendars: [{ ...BASE_COLLECTION.calendars[0], enabled: false }],
    })
    const { request, params } = makeRequest('test-collection')
    const response = await HEAD(request, { params })
    expect(response.status).toBe(404)
  })

  it('returns 400 for invalid ID', async () => {
    const { request, params } = makeRequest('-invalid')
    const response = await HEAD(request, { params })
    expect(response.status).toBe(400)
  })

  it('does not call combineICalFeeds', async () => {
    mockFind.mockResolvedValue(BASE_COLLECTION)
    const { request, params } = makeRequest('test-collection')
    await HEAD(request, { params })
    expect(mockCombine).not.toHaveBeenCalled()
  })
})
