import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { NextResponse } from 'next/server'
import { CalendarCollection } from '../types/calendar'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

declare global {
  var calendarCollections: CalendarCollection[]
}

export function initializeStorage(): void {
  if (!globalThis.calendarCollections) {
    globalThis.calendarCollections = []
  }
}

export function getStorageCollections(): CalendarCollection[] {
  initializeStorage()
  return globalThis.calendarCollections
}

export function addCollectionToStorage(collection: CalendarCollection): void {
  initializeStorage()
  globalThis.calendarCollections.push(collection)
}

export function removeCollectionFromStorage(guid: string): boolean {
  initializeStorage()
  const index = globalThis.calendarCollections.findIndex(
    col => col.guid === guid
  )
  if (index >= 0) {
    globalThis.calendarCollections.splice(index, 1)
    return true
  }
  return false
}

export function findCollectionInStorage(
  guid: string
): CalendarCollection | null {
  initializeStorage()
  return globalThis.calendarCollections.find(col => col.guid === guid) || null
}

export function updateCollectionInStorage(
  guid: string,
  updates: Partial<CalendarCollection>
): CalendarCollection | null {
  initializeStorage()
  const collection = globalThis.calendarCollections.find(
    col => col.guid === guid
  )
  if (!collection) return null

  Object.assign(collection, updates)
  collection.updatedAt = new Date().toISOString()
  return collection
}

export interface ApiError {
  error: string
  details?: string[]
  message?: string
}

export interface ApiSuccess<T = unknown> {
  data?: T
  message?: string
}

export function createErrorResponse(
  error: string,
  status: number,
  details?: string[],
  message?: string
): NextResponse<ApiError> {
  const errorBody: ApiError = { error }
  if (details) errorBody.details = details
  if (message) errorBody.message = message

  return NextResponse.json(errorBody, { status })
}

export function createSuccessResponse<T>(
  data?: T,
  status: number = 200,
  message?: string
): NextResponse<ApiSuccess<T>> {
  const successBody: ApiSuccess<T> = {}
  if (data !== undefined) successBody.data = data
  if (message) successBody.message = message

  return NextResponse.json(successBody, { status })
}

export function createValidationErrorResponse(
  validationErrors: string[]
): NextResponse<ApiError> {
  return createErrorResponse('Validation failed', 400, validationErrors)
}

export function createNotFoundResponse(
  resource: string = 'Resource'
): NextResponse<ApiError> {
  return createErrorResponse(`${resource} not found`, 404)
}

export function createServerErrorResponse(
  operation: string = 'operation'
): NextResponse<ApiError> {
  return createErrorResponse(`Failed to ${operation}`, 500)
}
