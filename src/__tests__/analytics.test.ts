// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { isProductionHostname, trackEvent } from '../lib/gtag'
import { shouldSendServerEvents } from '../lib/analytics'

const setHostname = (hostname: string): void => {
  Object.defineProperty(window, 'location', {
    value: { hostname },
    configurable: true,
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('isProductionHostname', () => {
  it.each(['www.calendar-aggregator.online', 'calendar-aggregator.online'])(
    'allows %s',
    host => expect(isProductionHostname(host)).toBe(true)
  )
  it.each(['localhost', 'calendar-aggregator-abc.vercel.app'])(
    'blocks %s',
    host => expect(isProductionHostname(host)).toBe(false)
  )
})

describe('client trackEvent', () => {
  it('sends on production hostname', () => {
    setHostname('www.calendar-aggregator.online')
    const gtag = vi.fn()
    window.gtag = gtag
    trackEvent('collection_creation_failed', { error_type: 'request_failed' })
    expect(gtag).toHaveBeenCalledWith('event', 'collection_creation_failed', {
      error_type: 'request_failed',
    })
  })

  it('does not send on localhost', () => {
    setHostname('localhost')
    const gtag = vi.fn()
    window.gtag = gtag
    trackEvent('feed_url_copied')
    expect(gtag).not.toHaveBeenCalled()
  })
})

describe('shouldSendServerEvents', () => {
  it('only sends for VERCEL_ENV=production', () => {
    expect(shouldSendServerEvents({ VERCEL_ENV: 'production' })).toBe(true)
    expect(shouldSendServerEvents({ VERCEL_ENV: 'preview' })).toBe(false)
    expect(shouldSendServerEvents({ NODE_ENV: 'production' })).toBe(false)
    expect(shouldSendServerEvents({})).toBe(false)
  })
})
