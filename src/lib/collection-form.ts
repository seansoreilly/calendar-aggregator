// Shared helpers for the create/manage collection forms: token storage,
// shared field styling, and row id generation for calendar source rows.

export function tokenStorageKey(guid: string): string {
  return `calendar-aggregator:token:${guid}`
}

export const FIELD_CLASS =
  'w-full border border-rule bg-paper px-3 py-2.5 text-sm text-ink placeholder-graphite/60 transition-colors focus:border-ink focus:outline-none focus:ring-0'

let rowIdCounter = 0

export function createRowId(prefix: string): string {
  rowIdCounter += 1
  return `${prefix}-${Date.now()}-${rowIdCounter}`
}

export interface CalendarRow {
  id: string
  url: string
  name: string
  color: string
  enabled: boolean
}

export function createEmptyCalendarRow(
  name: string,
  color: string
): CalendarRow {
  return { id: createRowId('cal'), url: '', name, color, enabled: true }
}
