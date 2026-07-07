/**
 * Shared, size-capped calendar body fetch used by both the create-time
 * connection test (`calendar-utils.ts`) and the feed combiner
 * (`ical-combiner.ts`).
 *
 * Consolidating these two previously-divergent fetch paths guarantees they
 * share the same SSRF hardening (via `safeFetch`), the same request headers,
 * and — critically — the same byte cap. The create path used to read the full
 * response body with no ceiling and hand it to a full iCal parser purely to
 * count events, which is an OOM risk on a hostile or very large source.
 */

import { safeFetch } from './safe-fetch'

/** Default per-source byte ceiling (25MB) — matches the combiner's historic cap. */
export const DEFAULT_MAX_SOURCE_BYTES = 25_000_000

/** Default request timeout for a single calendar fetch. */
export const DEFAULT_FETCH_TIMEOUT_MS = 15_000

/** Request headers presented to calendar sources. */
const CALENDAR_FETCH_HEADERS: Record<string, string> = {
  'User-Agent': 'Calendar-Aggregator/1.0',
  Accept: 'text/calendar, text/plain, */*',
}

export interface FetchCalendarOptions {
  /** Abort the request after this many ms. Ignored when `signal` is provided. */
  timeoutMs?: number
  /** Maximum bytes to accept from the response body. */
  maxBytes?: number
  /**
   * Caller-supplied abort signal. When present it is used as-is (the caller
   * owns the timeout); otherwise an internal timeout signal is created from
   * `timeoutMs`.
   */
  signal?: AbortSignal
}

export type FetchCalendarResult =
  | {
      ok: true
      body: string
      status: number
      contentType: string
      responseTimeMs: number
    }
  | {
      ok: false
      error: string
      status?: number
      contentType?: string
      responseTimeMs: number
    }

/**
 * Read a Response body as text while enforcing a hard byte ceiling. Streams the
 * body chunk-by-chunk and aborts as soon as the accumulated size would exceed
 * `maxBytes`, so an oversized (or unbounded) source can never be fully buffered
 * into memory. Falls back to `response.text()` when the body isn't streamable.
 */
async function readBodyWithCap(
  response: Response,
  maxBytes: number
): Promise<{ capped: false; text: string } | { capped: true }> {
  const body = response.body
  if (!body) {
    const text = await response.text()
    if (text.length > maxBytes) return { capped: true }
    return { capped: false, text }
  }

  const reader = body.getReader()
  const decoder = new TextDecoder()
  const chunks: string[] = []
  let total = 0

  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      if (value) {
        total += value.byteLength
        if (total > maxBytes) {
          await reader.cancel()
          return { capped: true }
        }
        chunks.push(decoder.decode(value, { stream: true }))
      }
    }
    chunks.push(decoder.decode())
  } finally {
    reader.releaseLock()
  }

  return { capped: false, text: chunks.join('') }
}

/**
 * Fetch a calendar source's body with SSRF protection, a request timeout, a
 * hard size cap, and a cheap `BEGIN:VCALENDAR` sanity check. Returns a tagged
 * result rather than throwing so callers can attribute per-source failures.
 */
export async function fetchCalendarBody(
  url: string,
  options: FetchCalendarOptions = {}
): Promise<FetchCalendarResult> {
  const {
    timeoutMs = DEFAULT_FETCH_TIMEOUT_MS,
    maxBytes = DEFAULT_MAX_SOURCE_BYTES,
    signal,
  } = options

  const startTime = Date.now()
  const fetchSignal = signal ?? AbortSignal.timeout(timeoutMs)

  try {
    // safeFetch performs the SSRF check on the initial URL and every redirect hop.
    const response = await safeFetch(url, {
      headers: CALENDAR_FETCH_HEADERS,
      signal: fetchSignal,
    })

    const responseTimeMs = Date.now() - startTime
    const contentType = response.headers.get('content-type') ?? ''

    if (response.status >= 500) {
      return {
        ok: false,
        error: `Server error (${response.status}): Calendar server is temporarily unavailable`,
        status: response.status,
        contentType,
        responseTimeMs,
      }
    }

    if (response.status >= 400) {
      return {
        ok: false,
        error: `Access denied (${response.status}): ${response.statusText}`,
        status: response.status,
        contentType,
        responseTimeMs,
      }
    }

    const read = await readBodyWithCap(response, maxBytes)
    if (read.capped) {
      return {
        ok: false,
        error: `Response too large (exceeds ${maxBytes} bytes)`,
        status: response.status,
        contentType,
        responseTimeMs,
      }
    }

    const body = read.text
    const hasCalendarData =
      contentType.includes('text/calendar') || body.includes('BEGIN:VCALENDAR')

    if (!hasCalendarData) {
      return {
        ok: false,
        error: 'Response does not appear to contain calendar data',
        status: response.status,
        contentType,
        responseTimeMs,
      }
    }

    return {
      ok: true,
      body,
      status: response.status,
      contentType,
      responseTimeMs,
    }
  } catch (error) {
    const responseTimeMs = Date.now() - startTime

    if (
      error instanceof Error &&
      (error.name === 'AbortError' || error.name === 'TimeoutError')
    ) {
      return {
        ok: false,
        error: `Connection timeout after ${timeoutMs}ms`,
        responseTimeMs,
      }
    }

    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      responseTimeMs,
    }
  }
}

/**
 * Cheap event count: number of `BEGIN:VEVENT` lines in the raw iCal text.
 * Replaces full `node-ical` parsing (which materialised every event as an
 * object just to count them). Matches only the line-anchored marker so
 * property values that merely contain the substring don't inflate the count.
 */
export function countVevents(icalBody: string): number {
  const matches = icalBody.match(/^BEGIN:VEVENT\s*$/gm)
  return matches ? matches.length : 0
}
