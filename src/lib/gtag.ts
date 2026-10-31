/**
 * Shared client-side Google Analytics event tracking helper.
 * The `window.gtag` type declaration lives in google-analytics.tsx.
 *
 * Events are only sent from the production hostnames so localhost and
 * preview deployments stay out of GA reports.
 */

export const PRODUCTION_HOSTNAMES: readonly string[] = [
  'www.calendar-aggregator.online',
  'calendar-aggregator.online',
]

export function isProductionHostname(hostname: string): boolean {
  return PRODUCTION_HOSTNAMES.includes(hostname.toLowerCase())
}

export function trackEvent(
  eventName: string,
  params?: Record<string, string | number>
): void {
  if (
    typeof window === 'undefined' ||
    !isProductionHostname(window.location.hostname) ||
    typeof window.gtag !== 'function'
  ) {
    return
  }
  if (params) {
    window.gtag('event', eventName, params)
  } else {
    window.gtag('event', eventName)
  }
}
