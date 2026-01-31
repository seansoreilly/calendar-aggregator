/**
 * Validation utilities for calendar collection operations
 * Provides input validation and data sanitization
 */

import { CreateCollectionRequest } from '../types/calendar'
import { ValidationError } from './errors'

/**
 * Validate ID format - accepts both UUIDs and custom IDs
 */
export function validateId(id: string): void {
  if (!id || typeof id !== 'string') {
    throw new ValidationError('ID must be a non-empty string', 'id', id)
  }

  if (id.trim().length === 0) {
    throw new ValidationError('ID cannot be empty', 'id', id)
  }

  // Check if it's a UUID
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  if (uuidRegex.test(id)) {
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
  if (!customId || typeof customId !== 'string') {
    throw new ValidationError(
      'Custom ID must be a non-empty string',
      'customId',
      customId
    )
  }

  if (customId.trim().length === 0) {
    throw new ValidationError('Custom ID cannot be empty', 'customId', customId)
  }

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

  // URL-safe format: alphanumeric, hyphens, underscores only
  const customIdRegex = /^[a-zA-Z0-9_-]+$/
  if (!customIdRegex.test(customId)) {
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

  // Reserved words check
  const reservedWords = [
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
  ]

  if (reservedWords.includes(customId.toLowerCase())) {
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
  if (!name || typeof name !== 'string') {
    throw new ValidationError(
      'Collection name is required and must be a string',
      'name',
      name
    )
  }

  if (name.trim().length === 0) {
    throw new ValidationError('Collection name cannot be empty', 'name', name)
  }

  if (name.length > 255) {
    throw new ValidationError(
      'Collection name cannot exceed 255 characters',
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
  } catch {
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
