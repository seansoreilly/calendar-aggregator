/**
 * Ownership enforcement for collection mutations (PUT/DELETE).
 *
 * A collection created after migration 004 carries an opaque `managementToken`.
 * Mutating it requires the caller to present that token as
 * `Authorization: Bearer <token>`.
 *
 * Collections with no stored token (legacy rows created before migration 004)
 * are immutable via the API: mutation is denied with 403. They can only be
 * changed directly in the database.
 */

import { timingSafeEqual } from 'node:crypto'
import { CalendarCollection } from '../types/calendar'
import { ForbiddenError, UnauthorizedError } from './errors'

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
 * - If the collection has NO stored token (legacy/null): deny with
 *   `ForbiddenError` (HTTP 403). There is no owner to authenticate, so nobody
 *   may mutate it through the API.
 * - If the collection HAS a stored token: require a matching bearer token,
 *   otherwise throw `UnauthorizedError` (mapped to HTTP 401 by errorResponse).
 */
export function authorizeMutation(
  collection: CalendarCollection,
  authorizationHeader: string | null
): void {
  const expected = collection.managementToken
  if (!expected) {
    throw new ForbiddenError()
  }

  const provided = extractBearerToken(authorizationHeader)
  if (!provided || !tokensMatch(provided, expected)) {
    throw new UnauthorizedError()
  }
}
