import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { CalendarCollection } from '../types/calendar'
import { UUID_REGEX } from './validation'

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

export function addCollectionToStorage(collection: CalendarCollection): void {
  initializeStorage()
  globalThis.calendarCollections.push(collection)
}

export function removeCollectionFromStorage(guid: string): boolean {
  initializeStorage()

  // Check if it's a UUID (case-sensitive) or custom ID (case-insensitive)
  const isUuid = UUID_REGEX.test(guid)

  const index = isUuid
    ? globalThis.calendarCollections.findIndex(col => col.guid === guid)
    : globalThis.calendarCollections.findIndex(
        col => col.guid.toLowerCase() === guid.toLowerCase()
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

  // Check if it's a UUID (case-sensitive) or custom ID (case-insensitive)
  const isUuid = UUID_REGEX.test(guid)

  if (isUuid) {
    // Exact match for UUIDs
    return globalThis.calendarCollections.find(col => col.guid === guid) || null
  } else {
    // Case-insensitive match for custom IDs
    return (
      globalThis.calendarCollections.find(
        col => col.guid.toLowerCase() === guid.toLowerCase()
      ) || null
    )
  }
}

export function updateCollectionInStorage(
  guid: string,
  updates: Partial<CalendarCollection>
): CalendarCollection | null {
  initializeStorage()

  // Check if it's a UUID (case-sensitive) or custom ID (case-insensitive)
  const isUuid = UUID_REGEX.test(guid)

  const collection = isUuid
    ? globalThis.calendarCollections.find(col => col.guid === guid)
    : globalThis.calendarCollections.find(
        col => col.guid.toLowerCase() === guid.toLowerCase()
      )

  if (!collection) return null

  Object.assign(collection, updates)
  collection.updatedAt = new Date().toISOString()
  return collection
}
