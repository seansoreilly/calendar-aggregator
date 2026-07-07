/**
 * Ownership enforcement for collection mutations (PUT/DELETE).
 *
 * A collection created after migration 004 carries an opaque `managementToken`.
 * Mutating it requires the caller to present that token as
 * `Authorization: Bearer <token>`.
 *
 * BACKWARD COMPATIBILITY: collections created before this feature (or via the
 * in-memory path without a token) have no stored token. Those remain mutable
 * without any Authorization header, exactly as before — see `authorizeMutation`.
 */

import { timingSafeEqual } from 'node:crypto'
import { CalendarCollection } from '../types/calendar'
import { UnauthorizedError } from './errors'

/**
 * Extract the bearer token from an `Authorization: Bearer <token>` header.
 * Returns null when the header is absent or not a well-formed bearer scheme.
 */
export function extractBearerToken(
  authorizationHeader: string | null
): string | null {
  if (!authorizationHeader) return null

  const match = /^Bearer\s+(.+)$/i.exec(authorizationHeader.trim())
  const token = match?.[1]?.trim()
  return token && token.length > 0 ? token : null
}

/**
 * Constant-time comparison of two tokens. Falls back to a plain inequality when
 * lengths differ (length is not secret and Buffer comparison requires equal
 * lengths). Avoids leaking token contents via timing side-channels.
 */
function tokensMatch(provided: string, expected: string): boolean {
  const a = Buffer.from(provided, 'utf8')
  const b = Buffer.from(expected, 'utf8')
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

/**
 * Authorize a mutation against a stored collection.
 *
 * - If the collection has NO stored token (legacy/null): allow unconditionally
 *   (backward compatibility). No Authorization header is required.
 * - If the collection HAS a stored token: require a matching bearer token,
 *   otherwise throw `UnauthorizedError` (mapped to HTTP 401 by errorResponse).
 */
export function authorizeMutation(
  collection: CalendarCollection,
  authorizationHeader: string | null
): void {
  const expected = collection.managementToken
  if (!expected) {
    // Legacy collection with no ownership token — mutable as before.
    return
  }

  const provided = extractBearerToken(authorizationHeader)
  if (!provided || !tokensMatch(provided, expected)) {
    throw new UnauthorizedError()
  }
}
