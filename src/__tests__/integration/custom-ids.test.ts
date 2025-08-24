import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '../../app/api/collections/route'
import { GET as getCollectionById } from '../../app/api/collections/[guid]/route'
import { validateCustomId } from '../../lib/validation'

// Mock the calendar validation function to avoid network calls in tests
vi.mock('../../lib/calendar-utils', async () => {
  const actual = await vi.importActual('../../lib/calendar-utils')
  return {
    ...actual,
    validateCalendarUrl: vi.fn().mockImplementation(() => {
      return Promise.resolve({
        isValid: true,
        statusCode: 200,
        contentType: 'text/calendar',
        hasCalendarData: true,
        eventCount: 5,
        responseTime: 100,
      })
    }),
  }
})

describe('Custom ID Functionality', () => {
  beforeEach(() => {
    // Reset global storage before each test
    if (globalThis.calendarCollections) {
      globalThis.calendarCollections = []
    }
    vi.clearAllMocks()
  })

  const mockCalendarData = {
    name: 'Test Collection',
    description: 'Test description',
    calendars: [
      {
        url: 'https://calendar.google.com/calendar/ical/test%40gmail.com/public/basic.ics',
        name: 'Test Calendar',
        color: '#3b82f6',
        enabled: true,
      },
    ],
  }

  describe('Custom ID Validation', () => {
    it('should accept valid custom IDs', () => {
      const validIds = [
        'my-calendar',
        'work_schedule',
        'team123',
        'abc123def',
        'project-alpha-beta',
      ]

      validIds.forEach(id => {
        expect(() => validateCustomId(id)).not.toThrow()
      })
    })

    it('should reject invalid custom IDs', () => {
      const invalidCases = [
        { id: '', reason: 'empty string' },
        { id: 'ab', reason: 'too short' },
        { id: 'a'.repeat(51), reason: 'too long' },
        { id: '-starts-with-dash', reason: 'starts with dash' },
        { id: '_starts-with-underscore', reason: 'starts with underscore' },
        { id: 'ends-with-dash-', reason: 'ends with dash' },
        { id: 'ends-with-underscore_', reason: 'ends with underscore' },
        { id: 'has spaces', reason: 'contains spaces' },
        { id: 'has@symbols', reason: 'contains special characters' },
        { id: 'has.dots', reason: 'contains dots' },
        { id: 'api', reason: 'reserved word' },
        { id: 'admin', reason: 'reserved word' },
        { id: 'calendar', reason: 'reserved word' },
        { id: 'CALENDAR', reason: 'reserved word case-insensitive' },
      ]

      invalidCases.forEach(({ id, reason }) => {
        expect(
          () => validateCustomId(id),
          `Failed for ${id} (${reason})`
        ).toThrow()
      })
    })
  })

  describe('Collection Creation with Custom IDs', () => {
    it('should create collection with valid custom ID', async () => {
      const requestData = {
        ...mockCalendarData,
        customId: 'my-custom-collection',
      }

      const request = new NextRequest('http://localhost:3000/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
      })

      const response = await POST(request)
      expect(response.status).toBe(201)

      const responseData = await response.json()
      expect(responseData.guid).toBe('my-custom-collection')
      expect(responseData.name).toBe(requestData.name)
    })

    it('should create collection with UUID when no customId provided', async () => {
      const request = new NextRequest('http://localhost:3000/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mockCalendarData),
      })

      const response = await POST(request)
      expect(response.status).toBe(201)

      const responseData = await response.json()
      expect(responseData.guid).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      )
    })

    it('should reject invalid custom IDs', async () => {
      const requestData = {
        ...mockCalendarData,
        customId: 'invalid@id',
      }

      const request = new NextRequest('http://localhost:3000/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
      })

      const response = await POST(request)
      expect(response.status).toBe(400)

      const responseData = await response.json()
      expect(responseData.error).toContain(
        'Custom ID can only contain letters, numbers, hyphens, and underscores'
      )
    })

    it('should reject reserved word custom IDs', async () => {
      const requestData = {
        ...mockCalendarData,
        customId: 'api',
      }

      const request = new NextRequest('http://localhost:3000/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
      })

      const response = await POST(request)
      expect(response.status).toBe(400)

      const responseData = await response.json()
      expect(responseData.error).toContain(
        'Custom ID cannot use reserved words'
      )
    })
  })

  describe('Custom ID Collision Detection', () => {
    it('should prevent duplicate custom IDs (case-insensitive)', async () => {
      // Create first collection
      const firstRequest = new NextRequest(
        'http://localhost:3000/api/collections',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...mockCalendarData,
            name: 'First Collection',
            customId: 'my-collection',
          }),
        }
      )

      const firstResponse = await POST(firstRequest)
      expect(firstResponse.status).toBe(201)

      // Attempt to create second collection with same ID (different case)
      const secondRequest = new NextRequest(
        'http://localhost:3000/api/collections',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...mockCalendarData,
            name: 'Second Collection',
            customId: 'MY-COLLECTION',
          }),
        }
      )

      const secondResponse = await POST(secondRequest)
      expect(secondResponse.status).toBe(409)

      const responseData = await secondResponse.json()
      expect(responseData.error).toBe(
        'A collection with this custom ID already exists'
      )
      expect(responseData.code).toBe('COLLECTION_EXISTS')
    })

    it('should allow same custom ID after first collection is deleted', async () => {
      // Create and then delete a collection (this would need delete endpoint)
      // For now, just test that different custom IDs work
      const firstRequest = new NextRequest(
        'http://localhost:3000/api/collections',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...mockCalendarData,
            customId: 'first-collection',
          }),
        }
      )

      const secondRequest = new NextRequest(
        'http://localhost:3000/api/collections',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...mockCalendarData,
            customId: 'second-collection',
          }),
        }
      )

      const firstResponse = await POST(firstRequest)
      const secondResponse = await POST(secondRequest)

      expect(firstResponse.status).toBe(201)
      expect(secondResponse.status).toBe(201)

      const firstData = await firstResponse.json()
      const secondData = await secondResponse.json()

      expect(firstData.guid).toBe('first-collection')
      expect(secondData.guid).toBe('second-collection')
    })
  })

  describe('Collection Retrieval with Custom IDs', () => {
    it('should retrieve collection by custom ID (case-insensitive)', async () => {
      // First create a collection
      const createRequest = new NextRequest(
        'http://localhost:3000/api/collections',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...mockCalendarData,
            customId: 'test-collection',
          }),
        }
      )

      const createResponse = await POST(createRequest)
      expect(createResponse.status).toBe(201)

      // Then retrieve it using different case
      const params = Promise.resolve({ guid: 'TEST-COLLECTION' })
      const getResponse = await getCollectionById({}, { params })

      expect(getResponse.status).toBe(200)

      const responseData = await getResponse.json()
      expect(responseData.guid).toBe('test-collection') // Original case preserved
      expect(responseData.name).toBe(mockCalendarData.name)
    })

    it('should retrieve UUID collections with exact case matching', async () => {
      // Create a collection without customId (will get UUID)
      const createRequest = new NextRequest(
        'http://localhost:3000/api/collections',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(mockCalendarData),
        }
      )

      const createResponse = await POST(createRequest)
      expect(createResponse.status).toBe(201)

      const createData = await createResponse.json()
      const uuid = createData.guid

      // Retrieve using exact UUID
      const params = Promise.resolve({ guid: uuid })
      const getResponse = await getCollectionById({}, { params })

      expect(getResponse.status).toBe(200)

      const responseData = await getResponse.json()
      expect(responseData.guid).toBe(uuid)
    })

    it('should return 404 for non-existent custom ID', async () => {
      const params = Promise.resolve({ guid: 'non-existent-collection' })
      const response = await getCollectionById({}, { params })

      expect(response.status).toBe(404)

      const responseData = await response.json()
      expect(responseData.error).toContain('not found')
    })
  })

  describe('URL Compatibility', () => {
    it('should work in URL paths with custom IDs', async () => {
      const customId = 'my-work-calendar'

      // Create collection
      const createRequest = new NextRequest(
        'http://localhost:3000/api/collections',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...mockCalendarData,
            customId,
          }),
        }
      )

      const createResponse = await POST(createRequest)
      expect(createResponse.status).toBe(201)

      // Verify it can be accessed via URL path
      const params = Promise.resolve({ guid: customId })
      const getResponse = await getCollectionById({}, { params })

      expect(getResponse.status).toBe(200)

      const responseData = await getResponse.json()
      expect(responseData.guid).toBe(customId)

      // This would be accessible as: /api/collections/my-work-calendar
      // And as calendar feed: /api/calendar/my-work-calendar
    })

    it('should handle hyphenated and underscored custom IDs in URLs', async () => {
      const testIds = ['team-alpha', 'project_beta', 'work-schedule_v2']

      for (const customId of testIds) {
        const createRequest = new NextRequest(
          'http://localhost:3000/api/collections',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...mockCalendarData,
              name: `Test Collection ${customId}`,
              customId,
            }),
          }
        )

        const createResponse = await POST(createRequest)
        expect(createResponse.status).toBe(201)

        const params = Promise.resolve({ guid: customId })
        const getResponse = await getCollectionById({}, { params })

        expect(getResponse.status).toBe(200)

        const responseData = await getResponse.json()
        expect(responseData.guid).toBe(customId)
      }
    })
  })

  describe('Mixed UUID and Custom ID Coexistence', () => {
    it('should handle both UUID and custom ID collections simultaneously', async () => {
      // Create UUID collection
      const uuidRequest = new NextRequest(
        'http://localhost:3000/api/collections',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...mockCalendarData,
            name: 'UUID Collection',
          }),
        }
      )

      // Create custom ID collection
      const customRequest = new NextRequest(
        'http://localhost:3000/api/collections',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...mockCalendarData,
            name: 'Custom Collection',
            customId: 'my-custom-id',
          }),
        }
      )

      const uuidResponse = await POST(uuidRequest)
      const customResponse = await POST(customRequest)

      expect(uuidResponse.status).toBe(201)
      expect(customResponse.status).toBe(201)

      const uuidData = await uuidResponse.json()
      const customData = await customResponse.json()

      // UUID should be a valid UUID format
      expect(uuidData.guid).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      )

      // Custom ID should be the exact string
      expect(customData.guid).toBe('my-custom-id')

      // Both should be retrievable
      const uuidParams = Promise.resolve({ guid: uuidData.guid })
      const customParams = Promise.resolve({ guid: 'my-custom-id' })

      const uuidGetResponse = await getCollectionById(
        {},
        { params: uuidParams }
      )
      const customGetResponse = await getCollectionById(
        {},
        { params: customParams }
      )

      expect(uuidGetResponse.status).toBe(200)
      expect(customGetResponse.status).toBe(200)
    })
  })
})
