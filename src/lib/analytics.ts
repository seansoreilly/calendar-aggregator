import { after } from 'next/server'

const GA_MEASUREMENT_ID = 'G-ESZWBFZV7F'

interface EventParams {
  [key: string]: string | number
}

/**
 * Send an event to GA4 via Measurement Protocol (server-side).
 * Uses `after` from next/server to defer the fetch until after the response
 * is sent, preventing Vercel Fluid Compute from freezing the function early.
 * Falls back to fire-and-forget if called outside a request scope.
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

  const measurementId = encodeURIComponent(GA_MEASUREMENT_ID)
  const secret = encodeURIComponent(apiSecret)
  const url = `https://www.google-analytics.com/mp/collect?measurement_id=${measurementId}&api_secret=${secret}`

  const sendEvent = (): void => {
    fetch(url, { method: 'POST', body }).catch(err => {
      console.error('[Analytics] Failed to send event:', err)
    })
  }

  try {
    after(sendEvent)
  } catch {
    sendEvent()
  }
}
