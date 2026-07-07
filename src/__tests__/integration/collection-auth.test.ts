import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '../../app/api/collections/route'
import {
  GET as getById,
  PUT,
  DELETE,
} from '../../app/api/collections/[guid]/route'
import {
  calendarFeedLimiter,
  collectionCreateLimiter,
} from '../../lib/rate-limit'

// Mock the calendar validation function to avoid network calls in tests
vi.mock('../../lib/calendar-utils', async () => {
  const actual = await vi.importActual('../../lib/calendar-utils')
  return {
    ...actual,
    validateCalendarUrl: vi.fn().mockResolvedValue({
      isValid: true,
      statusCode: 200,
      contentType: 'text/calendar',
      hasCalendarData: true,
      eventCount: 5,
      responseTime: 100,
    }),
  }
})

const mockCalendarData = {
  name: 'Auth Test Collection',
  description: 'A test collection for auth enforcement',
  calendars: [
    {
      url: 'https://calendar.google.com/calendar/ical/test%40gmail.com/public/basic.ics',
      name: 'Test Calendar',
      color: '#3b82f6',
      enabled: true,
    },
  ],
}

function createMockRequest(
  body?: unknown,
  method = 'POST',
  token?: string
): NextRequest {
  const url = 'http://localhost:3000/api/collections'
  const headers: Record<string, string> = body
    ? { 'content-type': 'application/json' }
    : {}
  if (token) headers['authorization'] = `Bearer ${token}`
  const init: ConstructorParameters<typeof NextRequest>[1] = { method, headers }
  if (body) init.body = JSON.stringify(body)
  return new NextRequest(url, init)
}

describe('Collection management token authorization', () => {
  beforeEach(() => {
    globalThis.calendarCollections = []
    collectionCreateLimiter.reset()
    calendarFeedLimiter.reset()
  })

  it('POST response body includes a non-empty managementToken', async () => {
    const request = createMockRequest(mockCalendarData)
    const response = await POST(request)
    const body = await response.json()

    expect(typeof body.managementToken).toBe('string')
    expect(body.managementToken.length).toBeGreaterThan(0)
  })

  it('GET response body does not include managementToken', async () => {
    const createRequest = createMockRequest(mockCalendarData)
    const createResponse = await POST(createRequest)
    const created = await createResponse.json()

    const params = Promise.resolve({ guid: created.guid })
    const getRequest = createMockRequest(undefined, 'GET')
    const getResponse = await getById(getRequest, { params })
    const body = await getResponse.json()

    expect(body.managementToken).toBeUndefined()
  })

  it('PUT with the correct token succeeds with 200', async () => {
    const createRequest = createMockRequest(mockCalendarData)
    const createResponse = await POST(createRequest)
    const created = await createResponse.json()

    const params = Promise.resolve({ guid: created.guid })
    const updateRequest = createMockRequest(
      { name: 'Updated Name' },
      'PUT',
      created.managementToken
    )
    const updateResponse = await PUT(updateRequest, { params })

    expect(updateResponse.status).toBe(200)
  })

  it('PUT with the wrong token is rejected with 401', async () => {
    const createRequest = createMockRequest(mockCalendarData)
    const createResponse = await POST(createRequest)
    const created = await createResponse.json()

    const params = Promise.resolve({ guid: created.guid })
    const updateRequest = createMockRequest(
      { name: 'Updated Name' },
      'PUT',
      'bad-token'
    )
    const updateResponse = await PUT(updateRequest, { params })
    const body = await updateResponse.json()

    expect(updateResponse.status).toBe(401)
    expect(body.code).toBe('UNAUTHORIZED')
  })

  it('PUT with no token on a token-bearing collection is rejected with 401', async () => {
    const createRequest = createMockRequest(mockCalendarData)
    const createResponse = await POST(createRequest)
    const created = await createResponse.json()

    const params = Promise.resolve({ guid: created.guid })
    const updateRequest = createMockRequest({ name: 'Updated Name' }, 'PUT')
    const updateResponse = await PUT(updateRequest, { params })

    expect(updateResponse.status).toBe(401)
  })

  it('DELETE with the wrong token is rejected with 401', async () => {
    const createRequest = createMockRequest(mockCalendarData)
    const createResponse = await POST(createRequest)
    const created = await createResponse.json()

    const params = Promise.resolve({ guid: created.guid })
    const deleteRequest = createMockRequest(undefined, 'DELETE', 'bad-token')
    const deleteResponse = await DELETE(deleteRequest, { params })

    expect(deleteResponse.status).toBe(401)
  })

  it('DELETE with the correct token succeeds with 200', async () => {
    const createRequest = createMockRequest(mockCalendarData)
    const createResponse = await POST(createRequest)
    const created = await createResponse.json()

    const params = Promise.resolve({ guid: created.guid })
    const deleteRequest = createMockRequest(
      undefined,
      'DELETE',
      created.managementToken
    )
    const deleteResponse = await DELETE(deleteRequest, { params })

    expect(deleteResponse.status).toBe(200)
  })

  describe('legacy collections with no managementToken', () => {
    function seedLegacyCollection(): void {
      const now = new Date().toISOString()
      globalThis.calendarCollections.push({
        guid: 'legacy-cal',
        name: 'Legacy',
        description: '',
        calendars: [
          {
            id: 1,
            url: 'https://x.test/a.ics',
            name: 'c',
            color: '#fff',
            enabled: true,
            createdAt: now,
            syncStatus: 'idle',
          },
        ],
        createdAt: now,
        updatedAt: now,
      })
    }

    it('PUT with no Authorization header succeeds (backward compat)', async () => {
      seedLegacyCollection()

      const params = Promise.resolve({ guid: 'legacy-cal' })
      const updateRequest = createMockRequest({ name: 'Legacy Updated' }, 'PUT')
      const updateResponse = await PUT(updateRequest, { params })

      expect(updateResponse.status).toBe(200)
    })

    it('DELETE with no Authorization header succeeds (backward compat)', async () => {
      seedLegacyCollection()

      const params = Promise.resolve({ guid: 'legacy-cal' })
      const deleteRequest = createMockRequest(undefined, 'DELETE')
      const deleteResponse = await DELETE(deleteRequest, { params })

      expect(deleteResponse.status).toBe(200)
    })
  })
})
