import { describe, it, expect } from 'vitest'
import {
  RateLimiter,
  clientKeyFromHeaders,
  rateLimitResponse,
} from '../lib/rate-limit'

describe('RateLimiter', () => {
  it('allows up to the limit, then denies the next request', () => {
    const limiter = new RateLimiter({ limit: 3, windowMs: 1000 })
    const now = 1_000_000

    const first = limiter.check('key', now)
    expect(first.allowed).toBe(true)
    expect(first.remaining).toBe(2)

    const second = limiter.check('key', now)
    expect(second.allowed).toBe(true)
    expect(second.remaining).toBe(1)

    const third = limiter.check('key', now)
    expect(third.allowed).toBe(true)
    expect(third.remaining).toBe(0)

    const fourth = limiter.check('key', now)
    expect(fourth.allowed).toBe(false)
    expect(fourth.remaining).toBe(0)
    expect(fourth.retryAfterSeconds).toBeGreaterThanOrEqual(1)
  })

  it('frees up the window once enough time has passed', () => {
    const limiter = new RateLimiter({ limit: 1, windowMs: 1000 })
    const now = 1_000_000

    const first = limiter.check('key', now)
    expect(first.allowed).toBe(true)

    const denied = limiter.check('key', now + 500)
    expect(denied.allowed).toBe(false)

    const allowedAgain = limiter.check('key', now + 1001)
    expect(allowedAgain.allowed).toBe(true)
  })

  it('tracks different keys independently', () => {
    const limiter = new RateLimiter({ limit: 1, windowMs: 1000 })
    const now = 1_000_000

    const a = limiter.check('a', now)
    const b = limiter.check('b', now)

    expect(a.allowed).toBe(true)
    expect(b.allowed).toBe(true)
  })

  it('reset() clears all recorded state', () => {
    const limiter = new RateLimiter({ limit: 1, windowMs: 1000 })
    const now = 1_000_000

    limiter.check('key', now)
    const denied = limiter.check('key', now)
    expect(denied.allowed).toBe(false)

    limiter.reset()

    const afterReset = limiter.check('key', now)
    expect(afterReset.allowed).toBe(true)
  })
})

describe('clientKeyFromHeaders', () => {
  it('uses the first value of x-forwarded-for', () => {
    const headers = new Headers({ 'x-forwarded-for': '1.1.1.1, 2.2.2.2' })
    expect(clientKeyFromHeaders(headers)).toBe('1.1.1.1')
  })

  it('falls back to x-real-ip when x-forwarded-for is absent', () => {
    const headers = new Headers({ 'x-real-ip': '3.3.3.3' })
    expect(clientKeyFromHeaders(headers)).toBe('3.3.3.3')
  })

  it('falls back to "unknown" when neither header is present', () => {
    const headers = new Headers({})
    expect(clientKeyFromHeaders(headers)).toBe('unknown')
  })
})

describe('rateLimitResponse', () => {
  it('returns a 429 with Retry-After header and JSON body', async () => {
    const response = rateLimitResponse({
      allowed: false,
      limit: 10,
      remaining: 0,
      retryAfterSeconds: 42,
    })

    expect(response.status).toBe(429)
    expect(response.headers.get('Retry-After')).toBe('42')

    const body = await response.json()
    expect(body).toMatchObject({
      code: 'RATE_LIMITED',
    })
    expect(typeof body.error).toBe('string')
  })
})
