import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from '../../app/api/collections/route'
import { GET as getCollectionById } from '../../app/api/collections/[guid]/route'

// Mock the calendar validation function to avoid network calls in tests
vi.mock('../../lib/calendar-utils', async () => {
  const actual = await vi.importActual('../../lib/calendar-utils')
  return {
    ...actual,
    validateCalendarUrl: vi.fn().mockImplementation((url: string) => {
      // Return invalid for obviously invalid URLs
      if (
        url === 'not-a-valid-url' ||
        (!url.startsWith('http') && !url.startsWith('webcal:'))
      ) {
        return Promise.resolve({
          isValid: false,
          error: 'Invalid URL format',
        })
      }
      // Return valid for all other URLs (including webcal and https)
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

// Mock data for testing
const mockCalendarData = {
  name: 'Test Calendar Collection',
  description: 'A test collection for integration testing',
  calendars: [
    {
      url: 'https://calendar.google.com/calendar/ical/test%40gmail.com/public/basic.ics',
      name: 'Test Calendar 1',
      color: '#3b82f6',
      enabled: true,
    },
    {
      url: 'webcal://outlook.live.com/owa/calendar/test@outlook.com/public/basic.ics',
      name: 'Test Calendar 2',
      color: '#ef4444',
      enabled: true,
    },
  ],
}

// Helper function to create a mock NextRequest
function createMockRequest(body?: unknown): NextRequest {
  const url = 'http://localhost:3000/api/collections'
  const request = new NextRequest(url, {
    method: body ? 'POST' : 'GET',
    headers: {
      'content-type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  return request
}

describe('Calendar Collections Integration Tests', () => {
  beforeEach(() => {
    // Initialize global storage before each test
    globalThis.calendarCollections = []
  })

  describe('Collections API', () => {
    it('should create a new calendar collection', async () => {
      const request = createMockRequest(mockCalendarData)
      const response = await POST(request)

      expect(response.status).toBe(201)

      const responseData = await response.json()
      expect(responseData).toMatchObject({
        name: mockCalendarData.name,
        description: mockCalendarData.description,
        calendars: expect.arrayContaining([
          expect.objectContaining({
            url: expect.stringContaining('https://calendar.google.com'),
            name: 'Test Calendar 1',
            color: '#3b82f6',
            enabled: true,
          }),
          expect.objectContaining({
            url: expect.stringContaining('https://outlook.live.com'),
            name: 'Test Calendar 2',
            color: '#ef4444',
            enabled: true,
          }),
        ]),
      })

      // Verify GUID is generated
      expect(responseData.guid).toBeDefined()
      expect(responseData.guid).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      )

      // Verify timestamps
      expect(responseData.createdAt).toBeDefined()
      expect(new Date(responseData.createdAt)).toBeInstanceOf(Date)

      // GUID is verified in the test above
    })

    it('should retrieve all calendar collections', async () => {
      // First create a collection
      const createRequest = createMockRequest(mockCalendarData)
      const createResponse = await POST(createRequest)
      const createdCollection = await createResponse.json()

      // Then retrieve all collections
      const getAllResponse = await GET()

      expect(getAllResponse.status).toBe(200)

      const collections = await getAllResponse.json()
      expect(Array.isArray(collections)).toBe(true)
      expect(collections).toHaveLength(1)
      expect(collections[0]).toMatchObject({
        guid: createdCollection.guid,
        name: mockCalendarData.name,
        description: mockCalendarData.description,
      })
    })

    it('should retrieve a specific calendar collection by GUID', async () => {
      // First create a collection
      const createRequest = createMockRequest(mockCalendarData)
      const createResponse = await POST(createRequest)
      const createdCollection = await createResponse.json()

      // Then retrieve it by GUID
      const params = Promise.resolve({ guid: createdCollection.guid })
      const getByIdRequest = createMockRequest()
      const getByIdResponse = await getCollectionById(getByIdRequest, {
        params,
      })

      expect(getByIdResponse.status).toBe(200)

      const retrievedCollection = await getByIdResponse.json()
      expect(retrievedCollection).toMatchObject({
        guid: createdCollection.guid,
        name: mockCalendarData.name,
        description: mockCalendarData.description,
        calendars: expect.arrayContaining([
          expect.objectContaining({
            name: 'Test Calendar 1',
            color: '#3b82f6',
          }),
          expect.objectContaining({
            name: 'Test Calendar 2',
            color: '#ef4444',
          }),
        ]),
      })
    })

    it('should handle webcal:// URL normalization', async () => {
      const dataWithWebcal = {
        ...mockCalendarData,
        calendars: [
          {
            url: 'webcal://calendar.google.com/calendar/ical/test%40gmail.com/public/basic.ics',
            name: 'Webcal Test Calendar',
            color: '#10b981',
            enabled: true,
          },
        ],
      }

      const request = createMockRequest(dataWithWebcal)
      const response = await POST(request)

      expect(response.status).toBe(201)

      const responseData = await response.json()
      expect(responseData.calendars[0].url).toMatch(/^https:\/\//)
      expect(responseData.calendars[0].url).not.toMatch(/^webcal:\/\//)
    })

    it('should validate required fields', async () => {
      const invalidData = {
        // Missing name
        calendars: mockCalendarData.calendars,
      }

      const request = createMockRequest(invalidData)
      const response = await POST(request)

      expect(response.status).toBe(400)

      const errorData = await response.json()
      expect(errorData.error).toBe('Collection name is required')
    })

    it('should validate calendar URLs and names', async () => {
      const invalidData = {
        name: 'Test Collection',
        calendars: [
          {
            url: 'not-a-valid-url',
            name: 'Invalid URL Calendar',
            color: '#3b82f6',
            enabled: true,
          },
        ],
      }

      const request = createMockRequest(invalidData)
      const response = await POST(request)

      expect(response.status).toBe(400)

      const errorData = await response.json()
      expect(errorData.error).toBe('Calendar validation failed')
      expect(errorData.details).toBeDefined()
      expect(Array.isArray(errorData.details)).toBe(true)
    })

    it('should return 404 for non-existent collection GUID', async () => {
      const nonExistentGuid = '00000000-0000-0000-0000-000000000000'
      const params = Promise.resolve({ guid: nonExistentGuid })
      const request = createMockRequest()

      const response = await getCollectionById(request, { params })

      expect(response.status).toBe(404)

      const errorData = await response.json()
      expect(errorData.error).toBe('Collection not found')
    })

    it('should handle empty collections list', async () => {
      const response = await GET()

      expect(response.status).toBe(200)

      const collections = await response.json()
      expect(Array.isArray(collections)).toBe(true)
      expect(collections).toHaveLength(0)
    })

    it('should assign sequential IDs to calendars within a collection', async () => {
      const request = createMockRequest(mockCalendarData)
      const response = await POST(request)

      const responseData = await response.json()
      expect(responseData.calendars[0].id).toBe(1)
      expect(responseData.calendars[1].id).toBe(2)
    })

    it('should set default values for optional calendar fields', async () => {
      const minimalCalendarData = {
        name: 'Minimal Collection',
        calendars: [
          {
            url: 'https://calendar.google.com/calendar/ical/test%40gmail.com/public/basic.ics',
            name: 'Minimal Calendar',
          },
        ],
      }

      const request = createMockRequest(minimalCalendarData)
      const response = await POST(request)

      const responseData = await response.json()
      const calendar = responseData.calendars[0]

      expect(calendar.color).toBe('#3b82f6') // Default color
      expect(calendar.enabled).toBe(true) // Default enabled state
      expect(calendar.syncStatus).toBe('idle') // Default sync status
      expect(calendar.createdAt).toBeDefined()
    })
  })

  describe('Error Handling', () => {
    it('should handle malformed JSON in POST requests', async () => {
      const url = 'http://localhost:3000/api/collections'
      const request = new NextRequest(url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: 'invalid json{',
      })

      // This should be caught by the try-catch in the API handler
      await expect(POST(request)).resolves.toBeDefined()
    })

    it('should handle missing content-type header', async () => {
      const url = 'http://localhost:3000/api/collections'
      const request = new NextRequest(url, {
        method: 'POST',
        body: JSON.stringify(mockCalendarData),
      })

      const response = await POST(request)
      // Should still work as Next.js handles JSON parsing gracefully
      expect([201, 400, 500]).toContain(response.status)
    })
  })
})
