import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('next/server', () => ({
  after: (fn: () => unknown) => fn(),
}))

import { trackEvent } from '../lib/analytics'

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

const enableProduction = (): void => {
  vi.stubEnv('VERCEL_ENV', 'production')
  vi.stubEnv('GA_API_SECRET', 'test-secret')
}

describe('server trackEvent', () => {
  it('sends with an abort signal so a slow GA call is bounded', async () => {
    enableProduction()
    const fetchMock = vi.fn().mockResolvedValue(new Response(null))
    vi.stubGlobal('fetch', fetchMock)

    trackEvent('feed_served', { events: 3 })
    await Promise.resolve()

    expect(fetchMock).toHaveBeenCalledOnce()
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit
    expect(init.method).toBe('POST')
    expect(init.signal).toBeInstanceOf(AbortSignal)
  })

  it('logs a warning, not an error, when the send fails', async () => {
    enableProduction()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new DOMException('timed out', 'TimeoutError'))
    )
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})

    trackEvent('feed_served', { events: 3 })
    await vi.waitFor(() =>
      expect(warn).toHaveBeenCalledWith(
        '[Analytics] event dropped:',
        'timed out'
      )
    )
    expect(error).not.toHaveBeenCalled()
  })

  it('skips outside production', () => {
    vi.stubEnv('VERCEL_ENV', 'preview')
    vi.stubEnv('GA_API_SECRET', 'test-secret')
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    trackEvent('feed_served', { events: 3 })
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
