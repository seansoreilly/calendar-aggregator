/**
 * Shared client-side Google Analytics event tracking helper.
 * The `window.gtag` type declaration lives in google-analytics.tsx.
 */

export function trackEvent(
  eventName: string,
  params?: Record<string, string | number>
): void {
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    if (params) {
      window.gtag('event', eventName, params)
    } else {
      window.gtag('event', eventName)
    }
  }
}
