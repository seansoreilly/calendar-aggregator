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

export async function processCalendarInputs(
  calendars: CollectionCalendarInput[]
): Promise<ProcessCalendarsResult> {
  const processedCalendars: CalendarSource[] = []
  const validationErrors: string[] = []

  for (const [index, calendarData] of calendars.entries()) {
    if (!calendarData?.url || !calendarData?.name) {
      validationErrors.push(`Calendar ${index + 1}: URL and name are required`)
      continue
    }

    const validationResult = await validateCalendarUrl(calendarData.url)
    if (!validationResult.isValid) {
      if (validationResult.statusCode && validationResult.statusCode >= 500) {
        console.warn(
          `Warning for ${calendarData.name}: ${validationResult.error}`
        )
      } else {
        validationErrors.push(
          `Calendar ${index + 1} (${calendarData.name}): ${validationResult.error}`
        )
        continue
      }
    }

    processedCalendars.push(buildCalendarSource(calendarData, index))
  }

  return {
    calendars: processedCalendars,
    validationErrors,
  }
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
  }
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
