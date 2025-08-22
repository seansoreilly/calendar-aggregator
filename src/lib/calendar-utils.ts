import axios from 'axios'
import * as ical from 'node-ical'

/**
 * Validates if a string is a properly formatted URL
 */
export function isValidUrl(urlString: string): boolean {
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
 * Validation result interface
 */
export interface ValidationResult {
  isValid: boolean
  error?: string
  warnings?: string[]
}

/**
 * Connection test result interface
 */
export interface ConnectionTestResult extends ValidationResult {
  statusCode?: number
  contentType?: string
  hasCalendarData?: boolean
  eventCount?: number
  responseTime?: number
}

/**
 * Tests if a calendar URL is accessible and returns valid iCal data
 */
export async function testCalendarConnection(
  urlString: string,
  timeoutMs: number = 10000
): Promise<ConnectionTestResult> {
  const startTime = Date.now()

  try {
    // Basic URL validation
    if (!isValidUrl(urlString)) {
      return {
        isValid: false,
        error: 'Invalid URL format',
      }
    }

    const normalizedUrl = normalizeCalendarUrl(urlString)

    // Make HTTP request with timeout
    const response = await axios.get(normalizedUrl, {
      timeout: timeoutMs,
      headers: {
        'User-Agent': 'Calendar-Aggregator/1.0',
      },
      maxRedirects: 5,
      validateStatus: () => true, // Accept all status codes, handle them manually
    })

    const responseTime = Date.now() - startTime
    const contentType = response.headers['content-type'] || ''

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

    // Check if response looks like calendar data
    const hasCalendarData =
      contentType.includes('text/calendar') ||
      response.data.includes('BEGIN:VCALENDAR')

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
      const calendarData = ical.parseICS(response.data)
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

    if (axios.isAxiosError(error)) {
      if (error.code === 'ECONNABORTED') {
        return {
          isValid: false,
          error: `Connection timeout after ${timeoutMs}ms`,
          responseTime,
        }
      }

      if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        return {
          isValid: false,
          error: 'Unable to connect to server',
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

  if (!isValidUrl(trimmedUrl)) {
    return {
      isValid: false,
      error: 'Invalid URL format',
    }
  }

  // Test connection
  return await testCalendarConnection(trimmedUrl)
}
