import { randomBytes } from 'node:crypto'
import {
  CalendarCollection,
  CalendarSource,
  CreateCollectionRequest,
} from '../types/calendar'
import { buildCalendarSource, validateCalendarUrl } from './calendar-utils'
import {
  sanitizeCollectionDescription,
  sanitizeCollectionName,
} from './validation'

type CollectionCalendarInput = CreateCollectionRequest['calendars'][number]

export interface ProcessCalendarsResult {
  calendars: CalendarSource[]
  validationErrors: string[]
}

type CalendarCheck =
  | { kind: 'ok'; source: CalendarSource }
  | { kind: 'error'; message: string }

/**
 * Validate a single calendar input by index. Kept per-index so the concurrent
 * checks below can preserve error attribution (`Calendar N (...)`) and ordering.
 */
async function checkCalendarInput(
  calendarData: CollectionCalendarInput,
  index: number
): Promise<CalendarCheck> {
  if (!calendarData?.url || !calendarData?.name) {
    return {
      kind: 'error',
      message: `Calendar ${index + 1}: URL and name are required`,
    }
  }

  const validationResult = await validateCalendarUrl(calendarData.url)
  if (!validationResult.isValid) {
    // 5xx upstream statuses are transient — warn but still include the source.
    if (validationResult.statusCode && validationResult.statusCode >= 500) {
      console.warn(
        `Warning for ${calendarData.name}: ${validationResult.error}`
      )
    } else {
      return {
        kind: 'error',
        message: `Calendar ${index + 1} (${calendarData.name}): ${validationResult.error}`,
      }
    }
  }

  return { kind: 'ok', source: buildCalendarSource(calendarData, index) }
}

export async function processCalendarInputs(
  calendars: CollectionCalendarInput[]
): Promise<ProcessCalendarsResult> {
  // Validate all sources concurrently; results stay index-ordered so error
  // attribution and the processed-calendar order match the input order.
  const checks = await Promise.all(
    calendars.map((calendarData, index) =>
      checkCalendarInput(calendarData, index)
    )
  )

  const processedCalendars: CalendarSource[] = []
  const validationErrors: string[] = []

  for (const check of checks) {
    if (check.kind === 'ok') {
      processedCalendars.push(check.source)
    } else {
      validationErrors.push(check.message)
    }
  }

  return {
    calendars: processedCalendars,
    validationErrors,
  }
}

/**
 * Generate an opaque, URL-safe management token. 24 random bytes → 32 base64url
 * characters (~192 bits of entropy), unguessable and safe to embed in a header.
 */
export function generateManagementToken(): string {
  return randomBytes(24).toString('base64url')
}

export function buildCollectionRecord(
  input: Pick<CreateCollectionRequest, 'name' | 'description'>,
  guid: string,
  calendars: CalendarSource[]
): CalendarCollection {
  const now = new Date().toISOString()
  const description = sanitizeCollectionDescription(input.description)

  return {
    guid,
    name: sanitizeCollectionName(input.name),
    ...(description ? { description } : {}),
    calendars,
    createdAt: now,
    updatedAt: now,
    // Every newly-created collection gets an ownership token. Returned once in
    // the POST response, then required (as a bearer token) for future mutations.
    managementToken: generateManagementToken(),
  }
}

/**
 * Public (GET-facing) view of a collection with the management token removed.
 * The token is an ownership secret and must NEVER appear in GET responses
 * (single or list) — only in the one-time POST creation response.
 */
export type PublicCollection = Omit<CalendarCollection, 'managementToken'>

/**
 * Strip the management token from a collection before serializing it to a
 * client on any read path. Returns a shallow copy so the caller's object is
 * left untouched.
 */
export function stripManagementToken(
  collection: CalendarCollection
): PublicCollection {
  const { managementToken: _managementToken, ...publicView } = collection
  return publicView
}

export function generateGuid(): string {
  if (
    typeof globalThis !== 'undefined' &&
    'crypto' in globalThis &&
    globalThis.crypto.randomUUID
  ) {
    return globalThis.crypto.randomUUID()
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}
