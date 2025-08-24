/**
 * Custom error classes for calendar collection operations
 * Provides structured error handling with meaningful error messages
 */

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

export class DatabaseConnectionError extends CalendarCollectionError {
  constructor(originalError: unknown) {
    super(
      'Database connection failed',
      'DATABASE_CONNECTION_ERROR',
      503,
      originalError
    )
    this.name = 'DatabaseConnectionError'
  }
}

export class DatabaseOperationError extends CalendarCollectionError {
  constructor(operation: string, originalError: unknown) {
    super(
      `Database ${operation} operation failed`,
      'DATABASE_OPERATION_ERROR',
      500,
      originalError
    )
    this.name = 'DatabaseOperationError'
  }
}

export class DuplicateCollectionError extends CalendarCollectionError {
  constructor(guid: string) {
    super(
      `Calendar collection with GUID '${guid}' already exists`,
      'DUPLICATE_COLLECTION',
      409,
      { guid }
    )
    this.name = 'DuplicateCollectionError'
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
