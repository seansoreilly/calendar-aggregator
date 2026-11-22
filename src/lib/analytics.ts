import { after } from 'next/server'

const GA_MEASUREMENT_ID = 'G-ESZWBFZV7F'
const ANALYTICS_TIMEOUT_MS = 2000

interface EventParams {
  [key: string]: string | number
}

/**
 * Server-side events are only sent from Vercel production deployments, so
 * previews, `next dev` and local `next start` don't pollute GA reports.
 */
export function shouldSendServerEvents(
  env: Record<string, string | undefined> = process.env
): boolean {
  return env.VERCEL_ENV === 'production'
}

/**
 * Send an event to GA4 via Measurement Protocol (server-side).
 * Uses `after` from next/server to defer the fetch until after the response
 * is sent, preventing Vercel Fluid Compute from freezing the function early.
 * Falls back to fire-and-forget if called outside a request scope.
 * Requires VERCEL_ENV=production and the GA_API_SECRET env var; silently
 * skips otherwise.
 */
export function trackEvent(name: string, params: EventParams): void {
  if (!shouldSendServerEvents()) return
  const apiSecret = process.env.GA_API_SECRET
  if (!apiSecret) return

  const body = JSON.stringify({
    client_id: 'server',
    non_personalized_ads: true,
    events: [{ name, params }],
  })

  const measurementId = encodeURIComponent(GA_MEASUREMENT_ID)
  const secret = encodeURIComponent(apiSecret)
  const url = `https://www.google-analytics.com/mp/collect?measurement_id=${measurementId}&api_secret=${secret}`

  // Returning the promise lets `after` keep the function alive until the
  // send settles; the timeout bounds that, and a dropped event is only a
  // warning because analytics is best-effort.
  const sendEvent = (): Promise<void> =>
    fetch(url, {
      method: 'POST',
      body,
      signal: AbortSignal.timeout(ANALYTICS_TIMEOUT_MS),
    }).then(
      () => undefined,
      (err: unknown) => {
        const message = err instanceof Error ? err.message : String(err)
        console.warn('[Analytics] event dropped:', message)
      }
    )

  try {
    after(sendEvent)
  } catch {
    void sendEvent()
  }
}
