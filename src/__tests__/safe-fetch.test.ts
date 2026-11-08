import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import http from 'node:http'
import zlib from 'node:zlib'
import {
  safeFetch,
  pinnedRequest,
  createPinnedLookup,
  type PinnedLookup,
} from '@/lib/safe-fetch'
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
    await expect(
      safeFetch('http://169.254.169.254/latest/meta-data/')
    ).rejects.toThrow(ValidationError)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('throws for an IPv4-mapped IPv6 metadata target', async () => {
    await expect(safeFetch('http://[::ffff:169.254.169.254]/')).rejects.toThrow(
      ValidationError
    )
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
      .mockResolvedValueOnce(
        redirectResponse('https://cdn.example.org/cal.ics')
      )
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

describe('createPinnedLookup', () => {
  const run = (
    resolver: Parameters<typeof createPinnedLookup>[0],
    options: Parameters<PinnedLookup>[1] = { all: true }
  ) =>
    new Promise<{
      err: NodeJS.ErrnoException | null
      address?: unknown
      family?: number | undefined
    }>(resolve => {
      createPinnedLookup(resolver)(
        'cal.example.com',
        options,
        (err, address, family) => resolve({ err, address, family })
      )
    })

  it('returns the validated addresses (all)', async () => {
    const records = [{ address: '93.184.216.34', family: 4 }]
    const r = await run(async () => records)
    expect(r.err).toBeNull()
    expect(r.address).toEqual(records)
  })

  it('returns a single address when all is not requested', async () => {
    const r = await run(
      async () => [{ address: '93.184.216.34', family: 4 }],
      {}
    )
    expect(r.address).toBe('93.184.216.34')
    expect(r.family).toBe(4)
  })

  it('rejects when ANY record is private (mixed answers)', async () => {
    const r = await run(async () => [
      { address: '93.184.216.34', family: 4 },
      { address: '10.0.0.5', family: 4 },
    ])
    expect(r.err?.code).toBe('ESSRF')
  })

  it.each(['::1', '::ffff:7f00:1', '64:ff9b::a00:1', 'fd00::1'])(
    'rejects IPv6 answer %s',
    async address => {
      const r = await run(async () => [{ address, family: 6 }])
      expect(r.err?.code).toBe('ESSRF')
    }
  )

  it('fails closed when resolution fails', async () => {
    const r = await run(async () => {
      throw Object.assign(new Error('getaddrinfo ENOTFOUND'), {
        code: 'ENOTFOUND',
      })
    })
    expect(r.err).not.toBeNull()
  })

  it('fails closed on an empty answer', async () => {
    const r = await run(async () => [])
    expect(r.err?.code).toBe('ENOTFOUND')
  })
})

describe('pinnedRequest transport', () => {
  let server: http.Server
  let port: number
  // Test-only lookup that skips the private-address filter so we can talk to
  // 127.0.0.1; the filter itself is covered by createPinnedLookup tests above.
  const anyLookup: PinnedLookup = (_h, options, cb) => {
    if (typeof options === 'object' && options?.all) {
      cb(null, [{ address: '127.0.0.1', family: 4 }])
    } else {
      cb(null, '127.0.0.1', 4)
    }
  }

  beforeEach(async () => {
    server = http.createServer((req, res) => {
      if (req.url === '/gz') {
        res.setHeader('content-encoding', 'gzip')
        res.end(zlib.gzipSync('BEGIN:VCALENDAR gz'))
      } else if (req.url === '/redir') {
        res.statusCode = 302
        res.setHeader('location', '/final')
        res.end()
      } else if (req.url === '/ua') {
        res.end(String(req.headers['user-agent']))
      } else {
        res.end('plain')
      }
    })
    await new Promise<void>(r => server.listen(0, '127.0.0.1', r))
    port = (server.address() as { port: number }).port
  })

  afterEach(async () => {
    await new Promise<void>(r => server.close(() => r()))
  })

  it('fetches plain bodies and forwards headers', async () => {
    const res = await pinnedRequest(
      `http://pinned.test:${port}/ua`,
      { headers: { 'User-Agent': 'UA/1' } },
      anyLookup
    )
    expect(await res.text()).toBe('UA/1')
  })

  it('decodes gzip bodies', async () => {
    const res = await pinnedRequest(
      `http://pinned.test:${port}/gz`,
      {},
      anyLookup
    )
    expect(await res.text()).toBe('BEGIN:VCALENDAR gz')
  })

  it('does not follow redirects itself', async () => {
    const res = await pinnedRequest(
      `http://pinned.test:${port}/redir`,
      {},
      anyLookup
    )
    expect(res.status).toBe(302)
    expect(res.headers.get('location')).toBe('/final')
  })

  it('refuses to connect to a hostname resolving to loopback (real filter)', async () => {
    const lookup = createPinnedLookup(async () => [
      { address: '127.0.0.1', family: 4 },
    ])
    await expect(
      pinnedRequest(`http://rebind.test:${port}/`, {}, lookup)
    ).rejects.toMatchObject({ code: 'ESSRF' })
  })

  it('connects only to the validated address even if DNS would change', async () => {
    // Resolver is consulted once per connection; the socket uses its answer.
    let calls = 0
    const lookup = createPinnedLookup(async () => {
      calls++
      return [{ address: '127.0.0.1', family: 4 }]
    })
    // Loopback is rejected, so no socket is ever opened against it.
    await expect(
      pinnedRequest(`http://rebind.test:${port}/`, {}, lookup)
    ).rejects.toBeDefined()
    expect(calls).toBe(1)
  })
})
