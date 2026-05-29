import * as ical from 'node-ical'
import { CalendarSource } from '../types/calendar'
import { safeFetch } from './safe-fetch'

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
  const startTime = Date.now()

  try {
    const signal = AbortSignal.timeout(timeoutMs)

    // safeFetch performs SSRF check on initial URL and every redirect hop
    const response = await safeFetch(urlString, {
      headers: {
        'User-Agent': 'Calendar-Aggregator/1.0',
      },
      signal,
    })

    const responseTime = Date.now() - startTime
    const contentType = response.headers.get('content-type') ?? ''

    // Handle server errors (5xx) more gracefully
    if (response.status >= 500) {
      return {
        isValid: false,
        error: `Server error (${response.status}): Calendar server is temporarily unavailable`,
        statusCode: response.status,
        contentType,
        responseTime,
      }
    }

    // Handle client errors (4xx)
    if (response.status >= 400) {
      return {
        isValid: false,
        error: `Access denied (${response.status}): ${response.statusText}`,
        statusCode: response.status,
        contentType,
        responseTime,
      }
    }

    const body = await response.text()

    // Check if response looks like calendar data
    const hasCalendarData =
      contentType.includes('text/calendar') || body.includes('BEGIN:VCALENDAR')

    if (!hasCalendarData) {
      return {
        isValid: false,
        error: 'Response does not appear to contain calendar data',
        warnings: [
          'Content-Type is not text/calendar',
          'No VCALENDAR data found',
        ],
        statusCode: response.status,
        contentType,
        responseTime,
      }
    }

    // Try to parse the calendar data
    let eventCount = 0
    try {
      const calendarData = ical.parseICS(body)
      eventCount = Object.values(calendarData).filter(
        component =>
          component &&
          typeof component === 'object' &&
          'type' in component &&
          component.type === 'VEVENT'
      ).length
    } catch {
      return {
        isValid: false,
        error: 'Failed to parse calendar data',
        statusCode: response.status,
        contentType,
        hasCalendarData: true,
        responseTime,
      }
    }

    return {
      isValid: true,
      statusCode: response.status,
      contentType,
      hasCalendarData: true,
      eventCount,
      responseTime,
    }
  } catch (error) {
    const responseTime = Date.now() - startTime

    if (error instanceof Error) {
      if (error.name === 'AbortError' || error.name === 'TimeoutError') {
        return {
          isValid: false,
          error: `Connection timeout after ${timeoutMs}ms`,
          responseTime,
        }
      }

      return {
        isValid: false,
        error: error.message || 'Network error',
        responseTime,
      }
    }

    return {
      isValid: false,
      error: 'Unknown error occurred',
      responseTime,
    }
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
