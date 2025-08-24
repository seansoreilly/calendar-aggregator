import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { POST, GET } from '../../app/api/collections/route'
import {
  GET as getById,
  PUT,
  DELETE,
} from '../../app/api/collections/[guid]/route'

// Mock the calendar validation function
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
  name: 'CRUD Test Collection',
  description: 'A test collection for CRUD operations',
  calendars: [
    {
      url: 'https://calendar.google.com/calendar/ical/test%40gmail.com/public/basic.ics',
      name: 'Test Calendar',
      color: '#3b82f6',
      enabled: true,
    },
  ],
}

function createMockRequest(body?: unknown, method = 'POST'): NextRequest {
  const url = 'http://localhost:3000/api/collections'
  return new NextRequest(url, {
    method,
    headers: body ? { 'content-type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  })
}

describe('Calendar Collections CRUD Operations', () => {
  beforeEach(() => {
    globalThis.calendarCollections = []
  })

  describe('PUT Operations', () => {
    it('should update a collection successfully', async () => {
      // First create a collection
      const createRequest = createMockRequest(mockCalendarData)
      const createResponse = await POST(createRequest)
      const createdCollection = await createResponse.json()

      // Update the collection
      const updateData = {
        name: 'Updated Collection Name',
        description: 'Updated description',
        calendars: [
          {
            url: 'https://outlook.live.com/owa/calendar/updated@outlook.com/public/basic.ics',
            name: 'Updated Calendar',
            color: '#ef4444',
            enabled: false,
          },
        ],
      }

      const updateRequest = createMockRequest(updateData, 'PUT')
      const params = Promise.resolve({ guid: createdCollection.guid })
      const updateResponse = await PUT(updateRequest, { params })

      expect(updateResponse.status).toBe(200)

      const updatedCollection = await updateResponse.json()
      expect(updatedCollection).toMatchObject({
        guid: createdCollection.guid,
        name: updateData.name,
        description: updateData.description,
        calendars: expect.arrayContaining([
          expect.objectContaining({
            name: 'Updated Calendar',
            color: '#ef4444',
            enabled: false,
          }),
        ]),
      })
    })

    it('should handle partial updates', async () => {
      // Create a collection
      const createRequest = createMockRequest(mockCalendarData)
      const createResponse = await POST(createRequest)
      const createdCollection = await createResponse.json()

      // Update only the name
      const partialUpdateData = {
        name: 'Partially Updated Name',
      }

      const updateRequest = createMockRequest(partialUpdateData, 'PUT')
      const params = Promise.resolve({ guid: createdCollection.guid })
      const updateResponse = await PUT(updateRequest, { params })

      expect(updateResponse.status).toBe(200)

      const updatedCollection = await updateResponse.json()
      expect(updatedCollection.name).toBe('Partially Updated Name')
      expect(updatedCollection.description).toBe(mockCalendarData.description)
      expect(updatedCollection.calendars).toHaveLength(1)
    })

    it('should return 404 for non-existent collection on update', async () => {
      const nonExistentGuid = '12345678-1234-1234-1234-123456789012'
      const updateData = { name: 'New Name' }

      const updateRequest = createMockRequest(updateData, 'PUT')
      const params = Promise.resolve({ guid: nonExistentGuid })
      const updateResponse = await PUT(updateRequest, { params })

      expect(updateResponse.status).toBe(404)

      const errorData = await updateResponse.json()
      expect(errorData.error).toBe('Collection not found')
    })

    it('should validate empty name on update', async () => {
      // Create a collection
      const createRequest = createMockRequest(mockCalendarData)
      const createResponse = await POST(createRequest)
      const createdCollection = await createResponse.json()

      // Try to update with empty name
      const invalidUpdateData = { name: '   ' }

      const updateRequest = createMockRequest(invalidUpdateData, 'PUT')
      const params = Promise.resolve({ guid: createdCollection.guid })
      const updateResponse = await PUT(updateRequest, { params })

      expect(updateResponse.status).toBe(400)

      const errorData = await updateResponse.json()
      expect(errorData.error).toBe('Collection name cannot be empty')
    })

    it('should validate calendars array on update', async () => {
      // Create a collection
      const createRequest = createMockRequest(mockCalendarData)
      const createResponse = await POST(createRequest)
      const createdCollection = await createResponse.json()

      // Try to update with empty calendars array
      const invalidUpdateData = { calendars: [] }

      const updateRequest = createMockRequest(invalidUpdateData, 'PUT')
      const params = Promise.resolve({ guid: createdCollection.guid })
      const updateResponse = await PUT(updateRequest, { params })

      expect(updateResponse.status).toBe(400)

      const errorData = await updateResponse.json()
      expect(errorData.error).toBe('Calendars must be a non-empty array')
    })
  })

  describe('DELETE Operations', () => {
    it('should delete a collection successfully', async () => {
      // Create a collection
      const createRequest = createMockRequest(mockCalendarData)
      const createResponse = await POST(createRequest)
      const createdCollection = await createResponse.json()

      // Verify it exists
      const params = Promise.resolve({ guid: createdCollection.guid })
      const getRequest = createMockRequest(undefined, 'GET')
      const getResponse = await getById(getRequest, { params })
      expect(getResponse.status).toBe(200)

      // Delete the collection
      const deleteRequest = createMockRequest(undefined, 'DELETE')
      const deleteResponse = await DELETE(deleteRequest, { params })

      expect(deleteResponse.status).toBe(200)

      const deleteData = await deleteResponse.json()
      expect(deleteData).toMatchObject({
        message: 'Collection deleted successfully',
        collection: expect.objectContaining({
          guid: createdCollection.guid,
          name: mockCalendarData.name,
        }),
      })

      // Verify it no longer exists
      const getAfterDeleteResponse = await getById(getRequest, { params })
      expect(getAfterDeleteResponse.status).toBe(404)
    })

    it('should return 404 when deleting non-existent collection', async () => {
      const nonExistentGuid = '12345678-1234-1234-1234-123456789012'
      const params = Promise.resolve({ guid: nonExistentGuid })
      const deleteRequest = createMockRequest(undefined, 'DELETE')

      const deleteResponse = await DELETE(deleteRequest, { params })

      expect(deleteResponse.status).toBe(404)

      const errorData = await deleteResponse.json()
      expect(errorData.error).toBe('Collection not found')
    })

    it('should handle missing GUID parameter', async () => {
      const params = Promise.resolve({ guid: '' })
      const deleteRequest = createMockRequest(undefined, 'DELETE')

      const deleteResponse = await DELETE(deleteRequest, { params })

      expect(deleteResponse.status).toBe(400)

      const errorData = await deleteResponse.json()
      expect(errorData.error).toBe('GUID is required')
    })
  })

  describe('Integration with existing collections', () => {
    it('should maintain collection list after CRUD operations', async () => {
      // Create multiple collections
      const collection1Request = createMockRequest({
        ...mockCalendarData,
        name: 'Collection 1',
      })
      const collection1Response = await POST(collection1Request)
      const collection1 = await collection1Response.json()

      const collection2Request = createMockRequest({
        ...mockCalendarData,
        name: 'Collection 2',
      })
      const collection2Response = await POST(collection2Request)
      const collection2 = await collection2Response.json()

      // Verify both exist
      const allCollectionsResponse = await GET()
      const allCollections = await allCollectionsResponse.json()
      expect(allCollections).toHaveLength(2)

      // Update collection 1
      const updateRequest = createMockRequest(
        { name: 'Updated Collection 1' },
        'PUT'
      )
      const updateParams = Promise.resolve({ guid: collection1.guid })
      await PUT(updateRequest, { params: updateParams })

      // Delete collection 2
      const deleteRequest = createMockRequest(undefined, 'DELETE')
      const deleteParams = Promise.resolve({ guid: collection2.guid })
      await DELETE(deleteRequest, { params: deleteParams })

      // Verify final state
      const finalCollectionsResponse = await GET()
      const finalCollections = await finalCollectionsResponse.json()
      expect(finalCollections).toHaveLength(1)
      expect(finalCollections[0]).toMatchObject({
        guid: collection1.guid,
        name: 'Updated Collection 1',
      })
    })
  })
})
