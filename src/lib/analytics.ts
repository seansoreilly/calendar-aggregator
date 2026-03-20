const GA_MEASUREMENT_ID = 'G-ESZWBFZV7F'

interface EventParams {
  [key: string]: string | number
}

/**
 * Send an event to GA4 via Measurement Protocol (server-side).
 * Fire-and-forget — errors are logged but never thrown.
 * Requires GA_API_SECRET env var; silently skips if absent.
 */
export function trackEvent(name: string, params: EventParams): void {
  const apiSecret = process.env.GA_API_SECRET
  if (!apiSecret) return

  const body = JSON.stringify({
    client_id: 'server',
    non_personalized_ads: true,
    events: [{ name, params }],
  })

  fetch(
    `https://www.google-analytics.com/mp/collect?measurement_id=${GA_MEASUREMENT_ID}&api_secret=${apiSecret}`,
    { method: 'POST', body }
  ).catch(err => {
    console.error('[Analytics] Failed to send event:', err)
  })
}
