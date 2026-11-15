import { describe, expect, it } from 'vitest'
import { authorizeMutation, hashManagementToken } from '../lib/collection-auth'
import { RateLimiter } from '../lib/rate-limit'
import {
  validateCollectionUpdateRequest,
  validateCreateCollectionRequest,
} from '../lib/validation'
import type { CalendarCollection } from '../types/calendar'

const FAKE_TOKEN = 'fake-token-for-tests-0123456789abcd'

function collectionWith(managementToken: string): CalendarCollection {
  return {
    guid: 'test-collection',
    name: 'Test',
    calendars: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    managementToken,
  }
}

describe('hashed management tokens', () => {
  it('accepts the raw token against a stored digest', () => {
    const c = collectionWith(hashManagementToken(FAKE_TOKEN))
    expect(() => authorizeMutation(c, `Bearer ${FAKE_TOKEN}`)).not.toThrow()
  })

  it('rejects the digest itself used as a bearer token', () => {
    const digest = hashManagementToken(FAKE_TOKEN)
    expect(() =>
      authorizeMutation(collectionWith(digest), `Bearer ${digest}`)
    ).toThrow()
  })

  it('rejects a wrong token against a stored digest', () => {
    const c = collectionWith(hashManagementToken(FAKE_TOKEN))
    expect(() => authorizeMutation(c, 'Bearer wrong-token')).toThrow()
  })

  it('still accepts legacy plaintext rows', () => {
    const c = collectionWith(FAKE_TOKEN)
    expect(() => authorizeMutation(c, `Bearer ${FAKE_TOKEN}`)).not.toThrow()
  })
})

describe('RateLimiter eviction', () => {
  it('drops idle keys after the window passes', () => {
    const limiter = new RateLimiter({ limit: 5, windowMs: 1000 })
    for (let i = 0; i < 100; i++) limiter.check(`ip-${i}`, 0)
    limiter.check('later', 5000)
    const size = (limiter as unknown as { hits: Map<string, number[]> }).hits
      .size
    expect(size).toBe(1)
  })
})

describe('calendar source field validation', () => {
  const base = { name: 'n', calendars: [] as unknown[] }
  const make = (cal: Record<string, unknown>) =>
    ({
      ...base,
      calendars: [{ url: 'https://example.com/a.ics', name: 'Work', ...cal }],
    }) as never

  it('accepts a normal source', () => {
    expect(() =>
      validateCreateCollectionRequest(make({ color: '#3b82f6', enabled: true }))
    ).not.toThrow()
  })

  it.each([
    ['css injection colour', { color: 'red;background:url(x)' }],
    ['control chars in name', { name: 'a\r\nb' }],
    ['oversized name', { name: 'x'.repeat(256) }],
    ['oversized url', { url: 'https://example.com/' + 'a'.repeat(2100) }],
    ['non-string name', { name: 42 }],
    ['non-boolean enabled', { enabled: 'yes' }],
  ])('rejects %s on create and update', (_label, override) => {
    expect(() => validateCreateCollectionRequest(make(override))).toThrow()
    expect(() => validateCollectionUpdateRequest(make(override))).toThrow()
  })
})
