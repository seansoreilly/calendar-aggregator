import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  generateGuid,
  generateManagementToken,
  buildCollectionRecord,
  stripManagementToken,
  processCalendarInputs,
} from '../lib/collection-service'
import { UUID_REGEX } from '../lib/validation'
import { CalendarSource } from '../types/calendar'

const TOKEN_REGEX = /^[A-Za-z0-9_-]+$/

vi.mock('../lib/calendar-utils', async () => {
  const actual = await vi.importActual('../lib/calendar-utils')
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

import { validateCalendarUrl } from '../lib/calendar-utils'

describe('generateGuid', () => {
  it('returns a string matching UUID_REGEX', () => {
    for (let i = 0; i < 10; i++) {
      expect(generateGuid()).toMatch(UUID_REGEX)
    }
  })
})

describe('generateManagementToken', () => {
  it('returns a non-empty url-safe base64 string', () => {
    const token = generateManagementToken()
    expect(token.length).toBeGreaterThan(0)
    expect(token).toMatch(TOKEN_REGEX)
  })

  it('returns a token of roughly 32 characters', () => {
    const token = generateManagementToken()
    expect(token.length).toBe(32)
  })

  it('returns different tokens across calls', () => {
    const a = generateManagementToken()
    const b = generateManagementToken()
    expect(a).not.toBe(b)
  })
})

describe('buildCollectionRecord', () => {
  const guid = 'test-guid'
  const calendars: CalendarSource[] = []

  it('sets guid', () => {
    const record = buildCollectionRecord(
      { name: 'My Collection' },
      guid,
      calendars
    )
    expect(record.guid).toBe(guid)
  })

  it('trims the name', () => {
    const record = buildCollectionRecord(
      { name: '  My Collection  ' },
      guid,
      calendars
    )
    expect(record.name).toBe('My Collection')
  })

  it('includes description when present', () => {
    const record = buildCollectionRecord(
      { name: 'My Collection', description: 'A description' },
      guid,
      calendars
    )
    expect(record.description).toBe('A description')
  })

  it('omits description when absent', () => {
    const record = buildCollectionRecord(
      { name: 'My Collection' },
      guid,
      calendars
    )
    expect(record.description).toBeUndefined()
  })

  it('sets createdAt/updatedAt as ISO strings', () => {
    const record = buildCollectionRecord(
      { name: 'My Collection' },
      guid,
      calendars
    )
    expect(new Date(record.createdAt).toISOString()).toBe(record.createdAt)
    expect(new Date(record.updatedAt as string).toISOString()).toBe(
      record.updatedAt
    )
  })

  it('always sets a managementToken', () => {
    const record = buildCollectionRecord(
      { name: 'My Collection' },
      guid,
      calendars
    )
    expect(record.managementToken).toMatch(TOKEN_REGEX)
    expect(record.managementToken?.length).toBeGreaterThan(0)
  })
})

describe('stripManagementToken', () => {
  it('returns a copy without managementToken', () => {
    const collection = buildCollectionRecord(
      { name: 'My Collection' },
      'guid-1',
      []
    )
    const publicView = stripManagementToken(collection)
    expect(publicView).not.toHaveProperty('managementToken')
  })

  it('does not mutate the original object', () => {
    const collection = buildCollectionRecord(
      { name: 'My Collection' },
      'guid-1',
      []
    )
    stripManagementToken(collection)
    expect(collection.managementToken).toBeDefined()
  })

  it('preserves other fields', () => {
    const collection = buildCollectionRecord(
      { name: 'My Collection', description: 'Desc' },
      'guid-1',
      []
    )
    const publicView = stripManagementToken(collection)
    expect(publicView.guid).toBe('guid-1')
    expect(publicView.name).toBe('My Collection')
    expect(publicView.description).toBe('Desc')
  })
})

describe('processCalendarInputs', () => {
  beforeEach(() => {
    vi.mocked(validateCalendarUrl).mockReset()
    vi.mocked(validateCalendarUrl).mockResolvedValue({
      isValid: true,
      statusCode: 200,
      contentType: 'text/calendar',
      hasCalendarData: true,
      eventCount: 5,
      responseTime: 100,
    })
  })

  it('processes two valid calendars, preserving order', async () => {
    const result = await processCalendarInputs([
      { url: 'https://example.com/a.ics', name: 'A' },
      { url: 'https://example.com/b.ics', name: 'B' },
    ])

    expect(result.validationErrors).toEqual([])
    expect(result.calendars).toHaveLength(2)
    expect(result.calendars[0]?.id).toBe(1)
    expect(result.calendars[0]?.name).toBe('A')
    expect(result.calendars[1]?.id).toBe(2)
    expect(result.calendars[1]?.name).toBe('B')
  })

  it('attributes a validation error to the correct index/name', async () => {
    vi.mocked(validateCalendarUrl).mockImplementation(async url => {
      if (url === 'https://example.com/bad.ics') {
        return { isValid: false, error: 'Invalid URL format' }
      }
      return {
        isValid: true,
        statusCode: 200,
        contentType: 'text/calendar',
        hasCalendarData: true,
        eventCount: 5,
        responseTime: 100,
      }
    })

    const result = await processCalendarInputs([
      { url: 'https://example.com/good.ics', name: 'Good' },
      { url: 'https://example.com/bad.ics', name: 'Bad' },
    ])

    expect(result.validationErrors).toEqual([
      'Calendar 2 (Bad): Invalid URL format',
    ])
    expect(result.calendars).toHaveLength(1)
    expect(result.calendars[0]?.name).toBe('Good')
  })

  it('reports missing url/name as a required-fields error', async () => {
    const result = await processCalendarInputs([
      // @ts-expect-error intentionally missing url for test
      { name: 'No URL' },
    ])

    expect(result.validationErrors).toEqual([
      'Calendar 1: URL and name are required',
    ])
    expect(result.calendars).toHaveLength(0)
  })

  it('treats a 5xx validation result as a warning, still including the source', async () => {
    vi.mocked(validateCalendarUrl).mockResolvedValue({
      isValid: false,
      error: 'Server error (503): Calendar server is temporarily unavailable',
      statusCode: 503,
    })

    const result = await processCalendarInputs([
      { url: 'https://example.com/flaky.ics', name: 'Flaky' },
    ])

    expect(result.validationErrors).toEqual([])
    expect(result.calendars).toHaveLength(1)
    expect(result.calendars[0]?.name).toBe('Flaky')
  })
})
