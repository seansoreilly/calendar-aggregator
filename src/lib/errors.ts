/**
 * Custom error classes for calendar collection operations
 * Provides structured error handling with meaningful error messages
 */

import { NextResponse } from 'next/server'

export class CalendarCollectionError extends Error {
  public readonly code: string
  public readonly statusCode: number
  public readonly details?: unknown

  constructor(
    message: string,
    code: string,
    statusCode = 500,
    details?: unknown
  ) {
    super(message)
    this.name = 'CalendarCollectionError'
    this.code = code
    this.statusCode = statusCode
    this.details = details
  }
}

export class CollectionNotFoundError extends CalendarCollectionError {
  constructor(guid: string) {
    super(
      `Calendar collection with GUID '${guid}' was not found`,
      'COLLECTION_NOT_FOUND',
      404,
      { guid }
    )
    this.name = 'CollectionNotFoundError'
  }
}

export class ValidationError extends CalendarCollectionError {
  constructor(message: string, field?: string, value?: unknown) {
    super(`Validation failed: ${message}`, 'VALIDATION_ERROR', 400, {
      field,
      value,
    })
    this.name = 'ValidationError'
  }
}

export class UnauthorizedError extends CalendarCollectionError {
  constructor(message = 'A valid management token is required') {
    super(message, 'UNAUTHORIZED', 401)
    this.name = 'UnauthorizedError'
  }
}

export class DatabaseOperationError extends CalendarCollectionError {
  constructor(operation: string, originalError: unknown) {
    super(
      `Database ${operation} operation failed`,
      'DATABASE_OPERATION_ERROR',
      503,
      originalError
    )
    this.name = 'DatabaseOperationError'
  }
}

/**
 * Type guard to check if error is a CalendarCollectionError
 */
export function isCalendarCollectionError(
  error: unknown
): error is CalendarCollectionError {
  return error instanceof CalendarCollectionError
}

/**
 * Build the standard JSON error response for a CalendarCollectionError.
 *
 * `includeDetails` controls whether `error.details` is echoed to the client.
 * It defaults to `false` so converted/unexpected errors never leak wrapped
 * internal details (raw DB messages, etc.). Callers that intend to surface
 * validation context to the client pass `true` explicitly.
 *
 * As a hard safety net, `details` is unconditionally stripped for server
 * errors (`statusCode >= 500`) regardless of the `includeDetails` argument.
 * Client errors (`statusCode < 500`) are validation-shaped and safe to echo,
 * so their details are included by default.
 */
export function errorResponse(
  error: CalendarCollectionError,
  includeDetails = false
): NextResponse {
  const isServerError = error.statusCode >= 500
  const isClientError = error.statusCode < 500
  const shouldIncludeDetails =
    !isServerError && (includeDetails || isClientError)

  return NextResponse.json(
    {
      error: error.message,
      code: error.code,
      ...(shouldIncludeDetails ? { details: error.details } : {}),
    },
    { status: error.statusCode }
  )
}

/**
 * Utility to convert unknown errors to CalendarCollectionError
 */
export function toCalendarCollectionError(
  error: unknown,
  operation = 'unknown'
): CalendarCollectionError {
  if (isCalendarCollectionError(error)) {
    return error
  }

  if (error instanceof Error) {
    return new DatabaseOperationError(operation, error)
  }

  return new CalendarCollectionError(
    `Unknown error occurred during ${operation}`,
    'UNKNOWN_ERROR',
    500,
    error
  )
}
