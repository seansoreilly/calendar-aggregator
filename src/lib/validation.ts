/**
 * Validation utilities for calendar collection operations
 * Provides input validation and data sanitization
 */

import {
  CalendarCollection,
  CalendarSource,
  CreateCollectionRequest,
  UpdateCollectionRequest,
} from '../types/calendar'
import { ValidationError } from './errors'

/**
 * Validate GUID format
 */
export function validateGuid(guid: string): void {
  if (!guid) {
    throw new ValidationError('GUID is required', 'guid', guid)
  }

  // UUID v4 format validation
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(guid)) {
    throw new ValidationError('Invalid GUID format', 'guid', guid)
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
 * Validate individual calendar source
 */
export function validateCalendarSource(source: Partial<CalendarSource>): void {
  if (!source) {
    throw new ValidationError('Calendar source is required')
  }

  // Validate required fields
  if (typeof source.id !== 'number' || source.id <= 0) {
    throw new ValidationError(
      'Calendar source ID must be a positive number',
      'id',
      source.id
    )
  }

  validateCalendarSourceUrl(source.url || '')

  if (!source.name || typeof source.name !== 'string') {
    throw new ValidationError(
      'Calendar source name is required',
      'name',
      source.name
    )
  }

  if (source.name.trim().length === 0) {
    throw new ValidationError(
      'Calendar source name cannot be empty',
      'name',
      source.name
    )
  }

  if (source.name.length > 255) {
    throw new ValidationError(
      'Calendar source name cannot exceed 255 characters',
      'name',
      source.name
    )
  }

  // Validate optional fields
  if (
    source.color &&
    (typeof source.color !== 'string' ||
      !source.color.match(/^#[0-9a-fA-F]{6}$/))
  ) {
    throw new ValidationError(
      'Calendar source color must be a valid hex color',
      'color',
      source.color
    )
  }

  if (source.enabled !== undefined && typeof source.enabled !== 'boolean') {
    throw new ValidationError(
      'Calendar source enabled must be a boolean',
      'enabled',
      source.enabled
    )
  }

  if (source.createdAt && typeof source.createdAt !== 'string') {
    throw new ValidationError(
      'Calendar source createdAt must be an ISO string',
      'createdAt',
      source.createdAt
    )
  }
}

/**
 * Validate array of calendar sources
 */
export function validateCalendarSources(sources: CalendarSource[]): void {
  if (!Array.isArray(sources)) {
    throw new ValidationError(
      'Calendar sources must be an array',
      'calendars',
      sources
    )
  }

  if (sources.length === 0) {
    throw new ValidationError(
      'At least one calendar source is required',
      'calendars',
      sources
    )
  }

  if (sources.length > 50) {
    throw new ValidationError(
      'Cannot exceed 50 calendar sources per collection',
      'calendars',
      sources
    )
  }

  // Validate each source
  sources.forEach((source, index) => {
    try {
      validateCalendarSource(source)
    } catch (error) {
      if (error instanceof ValidationError) {
        const field =
          error.details &&
          typeof error.details === 'object' &&
          'field' in error.details
            ? String(error.details.field)
            : 'unknown'
        const value =
          error.details &&
          typeof error.details === 'object' &&
          'value' in error.details
            ? error.details.value
            : undefined
        throw new ValidationError(
          `Calendar source ${index + 1}: ${error.message}`,
          `calendars[${index}].${field}`,
          value
        )
      }
      throw error
    }
  })

  // Check for duplicate IDs
  const ids = sources.map(s => s.id)
  const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index)
  if (duplicateIds.length > 0) {
    throw new ValidationError(
      `Duplicate calendar source IDs found: ${duplicateIds.join(', ')}`,
      'calendars',
      duplicateIds
    )
  }

  // Check for duplicate URLs
  const urls = sources.map(s => s.url.toLowerCase())
  const duplicateUrls = urls.filter((url, index) => urls.indexOf(url) !== index)
  if (duplicateUrls.length > 0) {
    throw new ValidationError(
      'Duplicate calendar source URLs are not allowed',
      'calendars',
      duplicateUrls
    )
  }
}

/**
 * Validate complete calendar collection
 */
export function validateCalendarCollection(
  collection: Partial<CalendarCollection>
): void {
  if (!collection) {
    throw new ValidationError('Collection data is required')
  }

  validateCollectionName(collection.name || '')
  validateCollectionDescription(collection.description)

  if (collection.calendars) {
    validateCalendarSources(collection.calendars)
  }

  if (collection.guid) {
    validateGuid(collection.guid)
  }

  if (collection.createdAt && typeof collection.createdAt !== 'string') {
    throw new ValidationError(
      'createdAt must be an ISO string',
      'createdAt',
      collection.createdAt
    )
  }

  if (collection.updatedAt && typeof collection.updatedAt !== 'string') {
    throw new ValidationError(
      'updatedAt must be an ISO string',
      'updatedAt',
      collection.updatedAt
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
 * Validate update collection request
 */
export function validateUpdateCollectionRequest(
  request: UpdateCollectionRequest
): void {
  if (!request) {
    throw new ValidationError('Request body is required')
  }

  // At least one field must be provided for update
  if (!request.name && !request.description && !request.calendars) {
    throw new ValidationError('At least one field must be provided for update')
  }

  if (request.name !== undefined) {
    validateCollectionName(request.name)
  }

  if (request.description !== undefined) {
    validateCollectionDescription(request.description)
  }

  if (request.calendars !== undefined) {
    if (!Array.isArray(request.calendars)) {
      throw new ValidationError(
        'Calendars must be an array',
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
