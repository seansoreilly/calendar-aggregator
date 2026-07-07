/**
 * Validation utilities for calendar collection operations
 * Provides input validation and data sanitization
 */

import {
  CreateCollectionRequest,
  UpdateCollectionRequest,
} from '../types/calendar'
import { ValidationError } from './errors'

export const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

// Matches C0 control characters (0x00–0x1F, incl. CR/LF) and DEL (0x7F).
// Used to reject inputs that could enable CRLF/header injection.
const CONTROL_CHAR_REGEX = /[\x00-\x1f\x7f]/

// URL-safe custom ID format: alphanumeric, hyphens, underscores only
const CUSTOM_ID_REGEX = /^[a-zA-Z0-9_-]+$/

// Custom IDs that would shadow application routes or reserved namespaces
const RESERVED_CUSTOM_IDS = new Set([
  'api',
  'admin',
  'root',
  'system',
  'config',
  'health',
  'status',
  'calendar',
  'calendars',
  'events',
  'collections',
  'sync',
])

/**
 * Assert that a value is a non-empty, non-whitespace string.
 * Messages are caller-supplied so existing API error text is preserved.
 */
function assertNonEmptyString(
  value: unknown,
  field: string,
  messages: { required: string; empty: string }
): asserts value is string {
  if (!value || typeof value !== 'string') {
    throw new ValidationError(messages.required, field, value)
  }

  if (value.trim().length === 0) {
    throw new ValidationError(messages.empty, field, value)
  }
}

/**
 * Validate ID format - accepts both UUIDs and custom IDs
 */
export function validateId(id: string): void {
  assertNonEmptyString(id, 'id', {
    required: 'ID must be a non-empty string',
    empty: 'ID cannot be empty',
  })

  // Check if it's a UUID
  if (UUID_REGEX.test(id)) {
    // Valid UUID, no further validation needed
    return
  }

  // Not a UUID, validate as custom ID
  validateCustomId(id)
}

/**
 * Validate custom ID format - URL-safe alphanumeric with hyphens and underscores
 */
export function validateCustomId(customId: string): void {
  assertNonEmptyString(customId, 'customId', {
    required: 'Custom ID must be a non-empty string',
    empty: 'Custom ID cannot be empty',
  })

  // Length constraints
  if (customId.length < 3) {
    throw new ValidationError(
      'Custom ID must be at least 3 characters long',
      'customId',
      customId
    )
  }

  if (customId.length > 50) {
    throw new ValidationError(
      'Custom ID cannot exceed 50 characters',
      'customId',
      customId
    )
  }

  if (!CUSTOM_ID_REGEX.test(customId)) {
    throw new ValidationError(
      'Custom ID can only contain letters, numbers, hyphens, and underscores',
      'customId',
      customId
    )
  }

  // Cannot start or end with hyphen or underscore
  if (
    customId.startsWith('-') ||
    customId.startsWith('_') ||
    customId.endsWith('-') ||
    customId.endsWith('_')
  ) {
    throw new ValidationError(
      'Custom ID cannot start or end with hyphen or underscore',
      'customId',
      customId
    )
  }

  if (RESERVED_CUSTOM_IDS.has(customId.toLowerCase())) {
    throw new ValidationError(
      'Custom ID cannot use reserved words',
      'customId',
      customId
    )
  }
}

/**
 * Validate collection name
 */
export function validateCollectionName(name: string): void {
  assertNonEmptyString(name, 'name', {
    required: 'Collection name is required and must be a string',
    empty: 'Collection name cannot be empty',
  })

  if (name.length > 255) {
    throw new ValidationError(
      'Collection name cannot exceed 255 characters',
      'name',
      name
    )
  }

  // Reject CR/LF and other C0 control characters to prevent CRLF/header
  // injection (the name is later echoed into response headers).
  if (CONTROL_CHAR_REGEX.test(name)) {
    throw new ValidationError(
      'Collection name must not contain control characters',
      'name',
      name
    )
  }
}

/**
 * Validate collection description
 */
export function validateCollectionDescription(description?: string): void {
  if (description !== undefined) {
    if (typeof description !== 'string') {
      throw new ValidationError(
        'Description must be a string',
        'description',
        description
      )
    }

    if (description.length > 1000) {
      throw new ValidationError(
        'Description cannot exceed 1000 characters',
        'description',
        description
      )
    }

    // Reject CR/LF and other C0 control characters to prevent CRLF/header
    // injection.
    if (CONTROL_CHAR_REGEX.test(description)) {
      throw new ValidationError(
        'Description must not contain control characters',
        'description',
        description
      )
    }
  }
}

const PRIVATE_IP_PATTERNS = [
  /^127\./, // 127.0.0.0/8 loopback
  /^10\./, // 10.0.0.0/8 private
  /^172\.(1[6-9]|2\d|3[01])\./, // 172.16.0.0/12 private
  /^192\.168\./, // 192.168.0.0/16 private
  /^169\.254\./, // 169.254.0.0/16 link-local (AWS IMDS)
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./, // 100.64.0.0/10 CGNAT
  /^0\./, // 0.0.0.0/8
  /^255\.255\.255\.255$/, // limited broadcast
  /^\[::1\]$/, // IPv6 loopback
  /^\[::\]$/, // IPv6 unspecified
  /^\[::ffff:/i, // IPv4-mapped IPv6 (e.g. [::ffff:7f00:1])
  /^\[f[cd][0-9a-f]{2}:/i, // IPv6 unique local fc00::/7 (fc00:–fdff:)
  /^\[fe80:/i, // IPv6 link-local
]

const BLOCKED_HOSTNAMES = new Set(['localhost', 'metadata.google.internal'])

/**
 * Returns true if the given hostname/IP string is a private, reserved, or
 * otherwise non-routable address that must not be reached over the network.
 * Operates purely on the textual representation, so it can be applied both to
 * URL hostnames and to DNS-resolved IP literals. IPv6 literals are expected to
 * retain their surrounding brackets (matching `URL.hostname` behaviour); bare
 * IPv6 literals are bracketed before matching.
 */
export function isPrivateAddress(host: string): boolean {
  let hostname = host.toLowerCase()

  if (BLOCKED_HOSTNAMES.has(hostname)) {
    return true
  }

  // Normalise bare IPv6 literals (e.g. from DNS resolution) to the bracketed
  // form the patterns expect.
  if (hostname.includes(':') && !hostname.startsWith('[')) {
    hostname = `[${hostname}]`
  }

  return PRIVATE_IP_PATTERNS.some(p => p.test(hostname))
}

/**
 * Throws if the URL's hostname resolves to a private/internal address.
 * Prevents SSRF attacks against cloud metadata endpoints and internal services.
 */
export function assertNotSsrfTarget(url: string): void {
  const parsed = new URL(url)
  const hostname = parsed.hostname.toLowerCase()

  if (BLOCKED_HOSTNAMES.has(hostname)) {
    throw new ValidationError(
      'Calendar URL hostname is not permitted',
      'url',
      url
    )
  }

  if (isPrivateAddress(hostname)) {
    throw new ValidationError(
      'Calendar URL must not point to a private network address',
      'url',
      url
    )
  }
}

/**
 * Validate calendar source URL
 */
export function validateCalendarSourceUrl(url: string): void {
  if (!url || typeof url !== 'string') {
    throw new ValidationError('Calendar source URL is required', 'url', url)
  }

  try {
    const parsedUrl = new URL(url)
    if (!['http:', 'https:', 'webcal:'].includes(parsedUrl.protocol)) {
      throw new ValidationError(
        'Calendar source URL must use HTTP, HTTPS, or webcal protocol',
        'url',
        url
      )
    }
    assertNotSsrfTarget(url)
  } catch (error) {
    if (error instanceof ValidationError) throw error
    throw new ValidationError(
      'Calendar source URL is not a valid URL',
      'url',
      url
    )
  }
}

/**
 * Validate create collection request
 */
export function validateCreateCollectionRequest(
  request: CreateCollectionRequest
): void {
  if (!request) {
    throw new ValidationError('Request body is required')
  }

  validateCollectionName(request.name)
  validateCollectionDescription(request.description)

  // Validate optional customId
  if (request.customId !== undefined) {
    validateCustomId(request.customId)
  }

  if (!request.calendars || !Array.isArray(request.calendars)) {
    throw new ValidationError(
      'Calendars array is required',
      'calendars',
      request.calendars
    )
  }

  // Transform and validate calendar sources
  request.calendars.forEach((cal, index) => {
    if (!cal.url || !cal.name) {
      throw new ValidationError(
        `Calendar ${index + 1}: URL and name are required`,
        `calendars[${index}]`,
        cal
      )
    }

    validateCalendarSourceUrl(cal.url)

    if (cal.name.trim().length === 0) {
      throw new ValidationError(
        `Calendar ${index + 1}: Name cannot be empty`,
        `calendars[${index}].name`,
        cal.name
      )
    }
  })
}

/**
 * Validate an update (PUT) request for a collection.
 *
 * Applies the same field-level primitives as `validateCreateCollectionRequest`
 * (length caps, control-char/CRLF rejection, SSRF-safe URLs) but every field is
 * optional — only the fields present on the request are validated. This closes
 * the header-injection gap where a PUT'd name/description (later echoed into
 * `X-Collection-*` response headers) bypassed control-char rejection.
 */
export function validateCollectionUpdateRequest(
  request: UpdateCollectionRequest
): void {
  if (!request || typeof request !== 'object') {
    throw new ValidationError('Request body is required')
  }

  if (request.name !== undefined) {
    validateCollectionName(request.name)
  }

  if (request.description !== undefined) {
    validateCollectionDescription(request.description)
  }

  if (request.calendars !== undefined) {
    if (!Array.isArray(request.calendars) || request.calendars.length === 0) {
      throw new ValidationError(
        'Calendars must be a non-empty array',
        'calendars',
        request.calendars
      )
    }

    request.calendars.forEach((cal, index) => {
      if (!cal?.url || !cal?.name) {
        throw new ValidationError(
          `Calendar ${index + 1}: URL and name are required`,
          `calendars[${index}]`,
          cal
        )
      }

      validateCalendarSourceUrl(cal.url)

      if (cal.name.trim().length === 0) {
        throw new ValidationError(
          `Calendar ${index + 1}: Name cannot be empty`,
          `calendars[${index}].name`,
          cal.name
        )
      }
    })
  }
}

/**
 * Sanitize collection name by trimming whitespace
 */
export function sanitizeCollectionName(name: string): string {
  return name.trim()
}

/**
 * Sanitize collection description by trimming whitespace
 */
export function sanitizeCollectionDescription(
  description?: string
): string | undefined {
  return description?.trim() || undefined
}
