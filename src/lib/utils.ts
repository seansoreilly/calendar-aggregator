import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { CalendarCollection } from '../types/calendar'
import { UUID_REGEX } from './validation'

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

declare global {
  var calendarCollections: CalendarCollection[]
}

/**
 * Build a predicate matching a collection against a guid: UUIDs match
 * case-sensitively, custom IDs case-insensitively.
 */
function matchesGuid(guid: string): (col: CalendarCollection) => boolean {
  if (UUID_REGEX.test(guid)) {
    return col => col.guid === guid
  }
  const lowered = guid.toLowerCase()
  return col => col.guid.toLowerCase() === lowered
}

export function initializeStorage(): void {
  if (!globalThis.calendarCollections) {
    globalThis.calendarCollections = []
  }
}

export function addCollectionToStorage(collection: CalendarCollection): void {
  initializeStorage()
  globalThis.calendarCollections.push(collection)
}

export function removeCollectionFromStorage(guid: string): boolean {
  initializeStorage()

  const index = globalThis.calendarCollections.findIndex(matchesGuid(guid))

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

  return globalThis.calendarCollections.find(matchesGuid(guid)) || null
}

export function updateCollectionInStorage(
  guid: string,
  updates: Partial<CalendarCollection>
): CalendarCollection | null {
  initializeStorage()

  const collection = globalThis.calendarCollections.find(matchesGuid(guid))

  if (!collection) return null

  Object.assign(collection, updates)
  collection.updatedAt = new Date().toISOString()
  return collection
}
