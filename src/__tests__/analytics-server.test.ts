import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { afterMock } = vi.hoisted(() => ({ afterMock: vi.fn() }))
vi.mock('next/server', () => ({ after: afterMock }))

import { trackEvent } from '../lib/analytics'

beforeEach(() => {
  vi.stubEnv('VERCEL_ENV', 'production')
  vi.stubEnv('GA_API_SECRET', 'test-secret')
  afterMock.mockReset()
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('server trackEvent', () => {
  it('hands after() a callback that returns the pending fetch', async () => {
    let resolveFetch: (r: Response) => void = () => {}
    const fetchMock = vi.fn(
      () => new Promise<Response>(resolve => (resolveFetch = resolve))
    )
    vi.stubGlobal('fetch', fetchMock)

    trackEvent('calendar_feed_retrieved', { source_count: 2 })

    expect(afterMock).toHaveBeenCalledTimes(1)
    const callback = afterMock.mock.calls[0]?.[0] as () => unknown
    const pending = callback()

    // after() only keeps the function alive for a promise it is given;
    // a void callback lets Vercel freeze the instance mid-request.
    expect(pending).toBeInstanceOf(Promise)
    expect(fetchMock).toHaveBeenCalledTimes(1)

    let settled = false
    void (pending as Promise<unknown>).then(() => (settled = true))
    await Promise.resolve()
    expect(settled).toBe(false)

    resolveFetch(new Response(null, { status: 204 }))
    await pending
    expect(settled).toBe(true)
  })

  it('swallows fetch failures so the response path never throws', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new TypeError('fetch failed')))
    )

    trackEvent('calendar_feed_error', { error_type: 'internal_error' })
    const callback = afterMock.mock.calls[0]?.[0] as () => Promise<unknown>

    await expect(callback()).resolves.toBeUndefined()
    expect(errorSpy).toHaveBeenCalledWith(
      '[Analytics] Failed to send event:',
      expect.any(TypeError)
    )
    errorSpy.mockRestore()
  })

  it('sends nothing outside production', () => {
    vi.stubEnv('VERCEL_ENV', 'preview')
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    trackEvent('calendar_feed_retrieved', { source_count: 1 })

    expect(afterMock).not.toHaveBeenCalled()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
