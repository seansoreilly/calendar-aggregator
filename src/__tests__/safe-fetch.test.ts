import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { safeFetch } from '@/lib/safe-fetch'
import { ValidationError } from '@/lib/errors'

// NODE_ENV is 'test' under vitest, so safeFetch skips the DNS-rebinding guard;
// these tests exercise the textual SSRF check + manual redirect logic only.

describe('safeFetch', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  // Typed accessors for fetch mock call arguments (avoids `Object is possibly
  // 'undefined'` on tuple indexing without resorting to `any`/`!`).
  function callUrl(index: number): string | URL | Request {
    const call = vi.mocked(fetch).mock.calls[index]
    if (!call) throw new Error(`fetch was not called ${index + 1} times`)
    return call[0]
  }

  function callInit(index: number): RequestInit {
    const call = vi.mocked(fetch).mock.calls[index]
    if (!call) throw new Error(`fetch was not called ${index + 1} times`)
    return call[1] ?? {}
  }

  function okResponse(body = 'OK'): Response {
    return new Response(body, { status: 200 })
  }

  function redirectResponse(location: string, status = 302): Response {
    return new Response(null, {
      status,
      headers: { location },
    })
  }

  it('throws (without calling fetch) when the initial URL is a private target', async () => {
    await expect(safeFetch('http://169.254.169.254/latest/meta-data/')).rejects.toThrow(
      ValidationError
    )
    expect(fetch).not.toHaveBeenCalled()
  })

  it('throws for an IPv4-mapped IPv6 metadata target', async () => {
    await expect(
      safeFetch('http://[::ffff:169.254.169.254]/')
    ).rejects.toThrow(ValidationError)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('passes a normal 200 response through', async () => {
    vi.mocked(fetch).mockResolvedValue(okResponse('hello'))

    const res = await safeFetch('https://example.com/cal.ics')

    expect(res.status).toBe(200)
    await expect(res.text()).resolves.toBe('hello')
    expect(fetch).toHaveBeenCalledTimes(1)
    // redirects are followed manually, so the underlying fetch must opt out
    expect(callInit(0)).toMatchObject({
      redirect: 'manual',
    })
  })

  it('follows a redirect to a public target and returns the final response', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(redirectResponse('https://cdn.example.org/cal.ics'))
      .mockResolvedValueOnce(okResponse('final'))

    const res = await safeFetch('https://example.com/cal.ics')

    expect(res.status).toBe(200)
    await expect(res.text()).resolves.toBe('final')
    expect(fetch).toHaveBeenCalledTimes(2)
    expect(callUrl(1)).toBe('https://cdn.example.org/cal.ics')
  })

  it('blocks a 3xx redirect that targets a private address', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      redirectResponse('http://169.254.169.254/latest/meta-data/')
    )

    await expect(safeFetch('https://example.com/cal.ics')).rejects.toThrow(
      ValidationError
    )
    // only the first hop should have been fetched
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('resolves relative redirect targets against the current URL', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(redirectResponse('/elsewhere/cal.ics'))
      .mockResolvedValueOnce(okResponse('relative'))

    const res = await safeFetch('https://example.com/start')

    expect(res.status).toBe(200)
    expect(callUrl(1)).toBe('https://example.com/elsewhere/cal.ics')
  })

  it('throws when the redirect limit is exceeded', async () => {
    // Always respond with a redirect to a public host -> never resolves.
    vi.mocked(fetch).mockResolvedValue(
      redirectResponse('https://example.com/loop')
    )

    await expect(
      safeFetch('https://example.com/start', { maxRedirects: 2 })
    ).rejects.toThrow(/too many redirects/)

    // initial + 2 allowed hops = 3 fetches before the limit trips
    expect(fetch).toHaveBeenCalledTimes(3)
  })

  it('carries method and headers across redirect hops', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(redirectResponse('https://example.com/next'))
      .mockResolvedValueOnce(okResponse('done'))

    await safeFetch('https://example.com/start', {
      method: 'GET',
      headers: { 'X-Test': 'abc' },
    })

    expect(callInit(1)).toMatchObject({
      method: 'GET',
      headers: { 'X-Test': 'abc' },
      redirect: 'manual',
    })
  })
})
