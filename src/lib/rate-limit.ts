/**
 * Best-effort in-memory sliding-window rate limiter, keyed by client IP.
 *
 * IMPORTANT — serverless caveat: this limiter lives in a single process's
 * memory. On serverless (Vercel Fluid Compute) a given instance is reused
 * across many requests, so per-instance limits ARE meaningful and catch the
 * common "one client hammering one warm instance" case — but they are NOT a
 * global guarantee. Traffic spread across multiple concurrent instances is
 * counted independently per instance, so the effective global limit can be a
 * multiple of the configured value. Treat this as a cheap first line of defence,
 * not a hard quota. For hard global limits, back this with a shared store
 * (e.g. Upstash/Redis) or an edge/WAF rule.
 */

import { NextResponse } from 'next/server'

interface RateLimitConfig {
  /** Maximum number of requests permitted within the window. */
  limit: number
  /** Sliding window length in milliseconds. */
  windowMs: number
}

export interface RateLimitResult {
  /** True when the request is within the limit and should proceed. */
  allowed: boolean
  /** Configured request ceiling for the window. */
  limit: number
  /** Requests remaining in the current window after counting this one. */
  remaining: number
  /** Seconds until the window frees up enough for the caller to retry. */
  retryAfterSeconds: number
}

/**
 * A single limiter instance owns its own bucket map. Distinct limiters (e.g.
 * one for collection creation, one for feed reads) keep separate state so their
 * counts never interfere.
 */
export class RateLimiter {
  private readonly limit: number
  private readonly windowMs: number
  private readonly hits = new Map<string, number[]>()
  private lastSweep = 0

  constructor(config: RateLimitConfig) {
    this.limit = Math.max(1, config.limit)
    this.windowMs = Math.max(1, config.windowMs)
  }

  /**
   * Record a request for `key` and report whether it is permitted. Timestamps
   * older than the window are pruned on each call, so memory for a given key is
   * bounded by `limit` entries while it is active.
   */
  check(key: string, now: number = Date.now()): RateLimitResult {
    const windowStart = now - this.windowMs
    this.sweep(now)
    const timestamps = (this.hits.get(key) ?? []).filter(t => t > windowStart)

    if (timestamps.length >= this.limit) {
      // Denied: retry once the oldest in-window hit ages out.
      const oldest = timestamps[0] ?? now
      const retryAfterMs = Math.max(0, oldest + this.windowMs - now)
      this.hits.set(key, timestamps)
      return {
        allowed: false,
        limit: this.limit,
        remaining: 0,
        retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)),
      }
    }

    timestamps.push(now)
    this.hits.set(key, timestamps)
    return {
      allowed: true,
      limit: this.limit,
      remaining: this.limit - timestamps.length,
      retryAfterSeconds: 0,
    }
  }

  /**
   * Evict keys whose hits have all aged out. Without this the map grows by one
   * entry per distinct client key forever (memory exhaustion on a warm
   * instance). Runs at most once per window.
   */
  private sweep(now: number): void {
    if (now - this.lastSweep < this.windowMs) return
    this.lastSweep = now
    const windowStart = now - this.windowMs
    for (const [key, stamps] of this.hits) {
      const last = stamps[stamps.length - 1]
      if (last === undefined || last <= windowStart) this.hits.delete(key)
    }
  }

  /** Test/maintenance helper: drop all recorded state. */
  reset(): void {
    this.hits.clear()
    this.lastSweep = 0
  }
}

/**
 * Derive a stable client key from request headers. Uses the FIRST value of
 * `x-forwarded-for` (the original client as seen by the edge), falling back to
 * `x-real-ip`, then a shared `unknown` bucket. On serverless the proxy sets
 * `x-forwarded-for`, so this is the best available client identity.
 */
export function clientKeyFromHeaders(headers: Headers): string {
  const forwardedFor = headers.get('x-forwarded-for')
  if (forwardedFor) {
    const first = forwardedFor.split(',')[0]?.trim()
    if (first) return first
  }

  const realIp = headers.get('x-real-ip')?.trim()
  if (realIp) return realIp

  return 'unknown'
}

/**
 * Standard 429 response for a denied request. Sets `Retry-After` (seconds) and
 * the informational `X-RateLimit-*` headers.
 */
export function rateLimitResponse(result: RateLimitResult): NextResponse {
  return NextResponse.json(
    {
      error: 'Rate limit exceeded. Please try again later.',
      code: 'RATE_LIMITED',
    },
    {
      status: 429,
      headers: {
        'Retry-After': result.retryAfterSeconds.toString(),
        'X-RateLimit-Limit': result.limit.toString(),
        'X-RateLimit-Remaining': result.remaining.toString(),
      },
    }
  )
}

function readEnvInt(name: string, fallback: number): number {
  const raw = process.env[name]
  if (!raw) return fallback
  const parsed = Number.parseInt(raw, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

// Limiters are module-level singletons so their in-memory counts persist across
// requests handled by the same warm instance. Limits are env-configurable with
// sane defaults.
//
// Collection creation (POST /api/collections): default 10 requests / minute.
export const collectionCreateLimiter = new RateLimiter({
  limit: readEnvInt('RATE_LIMIT_CREATE_PER_MIN', 10),
  windowMs: 60_000,
})

// Calendar feed reads (GET /api/calendar/[guid]): default 60 requests / minute.
export const calendarFeedLimiter = new RateLimiter({
  limit: readEnvInt('RATE_LIMIT_FEED_PER_MIN', 60),
  windowMs: 60_000,
})

// Collection mutations (PUT/DELETE /api/collections/[guid]): default 30 per
// minute per IP. Caps token-guessing attempts and DB load from unauthenticated
// callers (each attempt costs a database read before the token is checked).
export const collectionMutateLimiter = new RateLimiter({
  limit: readEnvInt('RATE_LIMIT_MUTATE_PER_MIN', 30),
  windowMs: 60_000,
})
