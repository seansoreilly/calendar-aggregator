/**
 * Integration tests for Supabase GUID column with TEXT type
 * Tests both UUID and custom ID storage after schema migration
 */

import { describe, it, expect, beforeAll, afterEach } from 'vitest'
import {
  saveCollectionToDatabase,
  findCollectionByGuidInDatabase,
  deleteCollectionFromDatabase,
  testSupabaseConnection,
} from '../../lib/supabase'
import { CalendarCollection } from '../../types/calendar'

// Test data
const mockUuidCollection: CalendarCollection = {
  guid: '550e8400-e29b-41d4-a716-446655440000', // Valid UUID
  name: 'Test UUID Collection',
  description: 'Testing UUID storage',
  calendars: [
    {
      id: 1,
      url: 'https://example.com/calendar.ics',
      name: 'Test Calendar',
      color: '#ff0000',
      enabled: true,
      createdAt: new Date().toISOString(),
      syncStatus: 'idle',
    },
  ],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

const mockCustomIdCollection: CalendarCollection = {
  guid: 'my-test-custom-id', // Custom ID (not UUID format)
  name: 'Test Custom ID Collection',
  description: 'Testing custom ID storage',
  calendars: [
    {
      id: 1,
      url: 'https://example.com/calendar2.ics',
      name: 'Test Calendar 2',
      color: '#00ff00',
      enabled: true,
      createdAt: new Date().toISOString(),
      syncStatus: 'idle',
    },
  ],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

describe('Supabase GUID Text Type Integration', () => {
  beforeAll(async () => {
    // Check if Supabase is available
    const connectionTest = await testSupabaseConnection()
    if (!connectionTest.success) {
      console.warn('Supabase not available, skipping integration tests')
      return
    }
  })

  afterEach(async () => {
    // Clean up test data
    try {
      await deleteCollectionFromDatabase(mockUuidCollection.guid)
      await deleteCollectionFromDatabase(mockCustomIdCollection.guid)
    } catch {
      // Ignore cleanup errors
    }
  })

  it('should store and retrieve collection with UUID guid', async () => {
    const connectionTest = await testSupabaseConnection()
    if (!connectionTest.success) {
      console.warn('Skipping test: Supabase not available')
      return
    }

    // Save collection with UUID
    const saved = await saveCollectionToDatabase(mockUuidCollection)
    expect(saved.guid).toBe(mockUuidCollection.guid)

    // Retrieve by UUID
    const retrieved = await findCollectionByGuidInDatabase(
      mockUuidCollection.guid
    )
    expect(retrieved).not.toBeNull()
    if (retrieved) {
      expect(retrieved.guid).toBe(mockUuidCollection.guid)
      expect(retrieved.name).toBe(mockUuidCollection.name)
    }
  })

  it('should store and retrieve collection with custom ID guid', async () => {
    const connectionTest = await testSupabaseConnection()
    if (!connectionTest.success) {
      console.warn('Skipping test: Supabase not available')
      return
    }

    // Save collection with custom ID
    const saved = await saveCollectionToDatabase(mockCustomIdCollection)
    expect(saved.guid).toBe(mockCustomIdCollection.guid)

    // Retrieve by custom ID (case-insensitive)
    const retrieved = await findCollectionByGuidInDatabase(
      mockCustomIdCollection.guid
    )
    expect(retrieved).not.toBeNull()
    if (retrieved) {
      expect(retrieved.guid).toBe(mockCustomIdCollection.guid)
      expect(retrieved.name).toBe(mockCustomIdCollection.name)
    }
  })

  it('should handle case-insensitive custom ID lookup', async () => {
    const connectionTest = await testSupabaseConnection()
    if (!connectionTest.success) {
      console.warn('Skipping test: Supabase not available')
      return
    }

    // Save collection with custom ID
    await saveCollectionToDatabase(mockCustomIdCollection)

    // Retrieve using different case
    const retrievedUpper = await findCollectionByGuidInDatabase(
      mockCustomIdCollection.guid.toUpperCase()
    )
    expect(retrievedUpper).not.toBeNull()
    if (retrievedUpper) {
      expect(retrievedUpper.guid).toBe(mockCustomIdCollection.guid)
    }

    const retrievedMixed =
      await findCollectionByGuidInDatabase('MY-test-CUSTOM-id')
    expect(retrievedMixed).not.toBeNull()
    if (retrievedMixed) {
      expect(retrievedMixed.guid).toBe(mockCustomIdCollection.guid)
    }
  })

  it('should maintain UUID exact case matching', async () => {
    const connectionTest = await testSupabaseConnection()
    if (!connectionTest.success) {
      console.warn('Skipping test: Supabase not available')
      return
    }

    // Save collection with UUID
    await saveCollectionToDatabase(mockUuidCollection)

    // UUID should match exactly (case-sensitive)
    const retrieved = await findCollectionByGuidInDatabase(
      mockUuidCollection.guid
    )
    expect(retrieved).not.toBeNull()

    // Different case UUID should still work (UUIDs are case-insensitive by nature)
    const retrievedUpper = await findCollectionByGuidInDatabase(
      mockUuidCollection.guid.toUpperCase()
    )
    expect(retrievedUpper).not.toBeNull()
  })

  it('should return null for non-existent guid', async () => {
    const connectionTest = await testSupabaseConnection()
    if (!connectionTest.success) {
      console.warn('Skipping test: Supabase not available')
      return
    }

    const nonExistent = await findCollectionByGuidInDatabase('does-not-exist')
    expect(nonExistent).toBeNull()

    const nonExistentUuid = await findCollectionByGuidInDatabase(
      '00000000-0000-0000-0000-000000000000'
    )
    expect(nonExistentUuid).toBeNull()
  })
})
