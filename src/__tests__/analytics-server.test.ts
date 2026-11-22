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
  vi.restoreAllMocks()
})

const afterCallback = (): (() => Promise<unknown>) =>
  afterMock.mock.calls[0]?.[0] as () => Promise<unknown>

describe('server trackEvent', () => {
  it('hands after() a callback that returns the pending fetch', async () => {
    let resolveFetch: (r: Response) => void = () => {}
    const fetchMock = vi.fn(
      () => new Promise<Response>(resolve => (resolveFetch = resolve))
    )
    vi.stubGlobal('fetch', fetchMock)

    trackEvent('calendar_feed_retrieved', { source_count: 2 })

    expect(afterMock).toHaveBeenCalledTimes(1)
    const pending = afterCallback()()

    // after() only keeps the function alive for a promise it is given;
    // a void callback lets Vercel freeze the instance mid-request.
    expect(pending).toBeInstanceOf(Promise)
    expect(fetchMock).toHaveBeenCalledTimes(1)

    let settled = false
    void pending.then(() => (settled = true))
    await Promise.resolve()
    expect(settled).toBe(false)

    resolveFetch(new Response(null, { status: 204 }))
    await pending
    expect(settled).toBe(true)
  })

  it('bounds the send with an abort signal', () => {
    const fetchMock = vi.fn(() => Promise.resolve(new Response(null)))
    vi.stubGlobal('fetch', fetchMock)

    trackEvent('calendar_feed_retrieved', { source_count: 1 })
    void afterCallback()()

    const init = (fetchMock.mock.calls[0] as unknown[] | undefined)?.[1] as
      RequestInit | undefined
    expect(init?.method).toBe('POST')
    expect(init?.signal).toBeInstanceOf(AbortSignal)
  })

  it('logs a dropped event as a warning and never rejects', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.reject(new DOMException('signal timed out', 'TimeoutError'))
      )
    )

    trackEvent('calendar_feed_error', { error_type: 'internal_error' })

    await expect(afterCallback()()).resolves.toBeUndefined()
    expect(warn).toHaveBeenCalledWith(
      '[Analytics] event dropped:',
      'signal timed out'
    )
    expect(error).not.toHaveBeenCalled()
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
