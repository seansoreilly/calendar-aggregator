import { CalendarSource } from '../types/calendar'
import { countVevents, fetchCalendarBody } from './calendar-fetch'

/**
 * Validates if a string is a properly formatted URL
 */
function isValidUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

/**
 * Normalizes a calendar URL (converts webcal:// to https://)
 */
export function normalizeCalendarUrl(urlString: string): string {
  return urlString.replace(/^webcal:\/\//, 'https://')
}

/**
 * Builds a CalendarSource from raw input, normalizing URL and applying defaults
 */
export function buildCalendarSource(
  cal: { url: string; name: string; color?: string; enabled?: boolean },
  index: number
): CalendarSource {
  return {
    id: index + 1,
    url: normalizeCalendarUrl(cal.url),
    name: cal.name,
    color: cal.color || '#3b82f6',
    enabled: cal.enabled !== false,
    createdAt: new Date().toISOString(),
    syncStatus: 'idle',
  }
}

/**
 * Connection test result interface
 */
export interface ConnectionTestResult {
  isValid: boolean
  error?: string
  warnings?: string[]
  statusCode?: number
  contentType?: string
  hasCalendarData?: boolean
  eventCount?: number
  responseTime?: number
}

/**
 * Tests if a calendar URL is accessible and returns valid iCal data
 */
async function testCalendarConnection(
  urlString: string,
  timeoutMs: number = 10000
): Promise<ConnectionTestResult> {
  // Delegates to the shared, size-capped fetch stack so the create-time
  // connection test cannot buffer an unbounded body. Event counting is a cheap
  // `BEGIN:VEVENT` scan rather than full iCal object parsing.
  const result = await fetchCalendarBody(urlString, { timeoutMs })

  if (!result.ok) {
    const base: ConnectionTestResult = {
      isValid: false,
      error: result.error,
      responseTime: result.responseTimeMs,
    }
    if (result.status !== undefined) base.statusCode = result.status
    if (result.contentType !== undefined) base.contentType = result.contentType
    if (result.error === 'Response does not appear to contain calendar data') {
      base.warnings = [
        'Content-Type is not text/calendar',
        'No VCALENDAR data found',
      ]
    }
    return base
  }

  return {
    isValid: true,
    statusCode: result.status,
    contentType: result.contentType,
    hasCalendarData: true,
    eventCount: countVevents(result.body),
    responseTime: result.responseTimeMs,
  }
}

/**
 * Validates calendar URL format and tests connection
 */
export async function validateCalendarUrl(
  urlString: string
): Promise<ConnectionTestResult> {
  // Basic format validation
  if (!urlString || typeof urlString !== 'string') {
    return {
      isValid: false,
      error: 'URL is required',
    }
  }

  const trimmedUrl = urlString.trim()

  // Normalize first so webcal:// URLs pass the http/https check
  const normalized = normalizeCalendarUrl(trimmedUrl)

  if (!isValidUrl(normalized)) {
    return {
      isValid: false,
      error: 'Invalid URL format',
    }
  }

  // Test connection using the normalized URL
  return await testCalendarConnection(normalized)
}
