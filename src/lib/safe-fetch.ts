/**
 * SSRF-hardened fetch primitive.
 *
 * Wraps the global `fetch` with:
 *  - a textual SSRF guard (`assertNotSsrfTarget`) before any network call,
 *  - a best-effort DNS-rebinding guard that rejects hostnames resolving to any
 *    private/reserved IP (skipped under NODE_ENV=test),
 *  - manual redirect following that re-validates every hop.
 *
 * Always calls the global `fetch`, so test fetch mocks intercept correctly.
 */

import { lookup } from 'dns/promises'
import { assertNotSsrfTarget, isPrivateAddress } from './validation'

export { isPrivateAddress }

const DEFAULT_MAX_REDIRECTS = 5

/**
 * Best-effort DNS-rebinding guard. Resolves the hostname to all addresses and
 * throws if any resolved IP is private/reserved. Skipped entirely under
 * NODE_ENV=test so fetch-stub tests stay deterministic. On resolution failure
 * we warn and proceed with the textual check only.
 */
async function assertResolvedAddressesArePublic(url: string): Promise<void> {
  if (process.env.NODE_ENV === 'test') {
    return
  }

  const { hostname } = new URL(url)

  try {
    const records = await lookup(hostname, { all: true })
    for (const { address } of records) {
      if (isPrivateAddress(address)) {
        throw new Error(
          `Refusing to fetch ${url}: hostname resolves to private address ${address}`
        )
      }
    }
  } catch (error) {
    // Re-throw our own private-address rejection; only swallow resolution errors.
    if (error instanceof Error && error.message.startsWith('Refusing to fetch')) {
      throw error
    }
    console.warn(
      `safeFetch: DNS resolution failed for ${hostname}, proceeding with textual check only:`,
      error instanceof Error ? error.message : error
    )
  }
}

/**
 * Guarded fetch. Validates the target (and every redirect hop) against SSRF
 * targets before issuing the request, and follows 3xx redirects manually up to
 * `maxRedirects` (default 5), carrying method/headers/body/signal across hops.
 */
export async function safeFetch(
  url: string,
  init?: RequestInit & { maxRedirects?: number }
): Promise<Response> {
  const { maxRedirects = DEFAULT_MAX_REDIRECTS, ...requestInit } = init ?? {}

  let currentUrl = url

  // One initial request plus up to `maxRedirects` redirect hops.
  for (let hop = 0; hop <= maxRedirects; hop++) {
    assertNotSsrfTarget(currentUrl)
    await assertResolvedAddressesArePublic(currentUrl)

    const response = await fetch(currentUrl, {
      ...requestInit,
      redirect: 'manual',
    })

    const location = response.headers.get('location')
    const isRedirect =
      response.status >= 300 && response.status < 400 && location !== null

    if (!isRedirect || location === null) {
      return response
    }

    // Resolve relative redirect targets against the current URL.
    currentUrl = new URL(location, currentUrl).toString()
  }

  throw new Error(
    `safeFetch: too many redirects (exceeded ${maxRedirects}) starting from ${url}`
  )
}
