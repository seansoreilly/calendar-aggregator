/**
 * SSRF-hardened fetch primitive.
 *
 *  - `assertNotSsrfTarget` rejects private/reserved IP literals and blocked
 *    hostnames before any network call (IPv6 literals are bracket-stripped and
 *    range-checked numerically).
 *  - Outside tests, requests go through `pinnedRequest`, a `node:http(s)`
 *    transport whose `lookup` resolves the hostname, rejects the connection if
 *    ANY resolved address is private/reserved, and returns only validated
 *    addresses. The socket therefore connects to exactly the addresses that
 *    were checked, closing the validate-then-resolve-again (DNS rebinding)
 *    window. Resolution failures fail closed.
 *  - Redirects are followed manually (max 5 hops); every hop is re-validated
 *    and re-pinned.
 *
 * Under NODE_ENV=test the global `fetch` is used instead so fetch stubs keep
 * working; the transport itself is covered by dedicated tests.
 */

import http from 'node:http'
import https from 'node:https'
import { lookup as dnsLookup } from 'node:dns'
import { Readable } from 'node:stream'
import zlib from 'node:zlib'
import { assertNotSsrfTarget, isPrivateAddress } from './validation'

export { isPrivateAddress }

const DEFAULT_MAX_REDIRECTS = 5

interface ResolvedAddress {
  address: string
  family: number
}

type Resolver = (hostname: string) => Promise<ResolvedAddress[]>

type LookupCallback = (
  err: NodeJS.ErrnoException | null,
  address?: string | ResolvedAddress[],
  family?: number
) => void

export type PinnedLookup = (
  hostname: string,
  options: { all?: boolean; family?: number } | number | undefined,
  callback: LookupCallback
) => void

const systemResolver: Resolver = hostname =>
  new Promise((resolve, reject) => {
    dnsLookup(hostname, { all: true }, (err, addresses) =>
      err ? reject(err) : resolve(addresses)
    )
  })

/**
 * Builds a `net`-compatible `lookup` function that refuses to hand back any
 * private/reserved address. Used as the socket's only name-resolution path, so
 * the validated answer is the one connected to.
 */
export function createPinnedLookup(
  resolver: Resolver = systemResolver
): PinnedLookup {
  return (hostname, options, callback) => {
    const opts = typeof options === 'object' && options ? options : {}
    const wantFamily =
      typeof options === 'number' ? options : (opts.family ?? 0)

    resolver(hostname).then(
      records => {
        if (records.length === 0) {
          callback(
            Object.assign(new Error(`No addresses found for ${hostname}`), {
              code: 'ENOTFOUND',
            })
          )
          return
        }
        for (const { address } of records) {
          if (isPrivateAddress(address)) {
            callback(
              Object.assign(
                new Error(
                  `Refusing to connect to ${hostname}: resolves to private address ${address}`
                ),
                { code: 'ESSRF' }
              )
            )
            return
          }
        }
        const usable = records.filter(
          r => wantFamily === 0 || r.family === wantFamily
        )
        if (usable.length === 0) {
          callback(
            Object.assign(new Error(`No addresses found for ${hostname}`), {
              code: 'ENOTFOUND',
            })
          )
          return
        }
        if (opts.all) {
          callback(null, usable)
        } else {
          const first = usable[0] as ResolvedAddress
          callback(null, first.address, first.family)
        }
      },
      (error: unknown) => {
        // Fail closed: an unresolvable host is never fetched.
        callback(error instanceof Error ? error : new Error(String(error)))
      }
    )
  }
}

function decoderFor(
  encoding: string
): zlib.Gunzip | zlib.BrotliDecompress | null {
  switch (encoding) {
    case 'gzip':
    case 'x-gzip':
      return zlib.createGunzip()
    case 'deflate':
      return zlib.createInflate()
    case 'br':
      return zlib.createBrotliDecompress()
    default:
      return null
  }
}

/**
 * Single-hop HTTP(S) request (no redirect following) whose DNS resolution goes
 * through `lookup`. Returns a standard `Response`.
 */
export function pinnedRequest(
  url: string,
  init: RequestInit = {},
  lookup: PinnedLookup = createPinnedLookup()
): Promise<Response> {
  const target = new URL(url)
  const transport =
    target.protocol === 'https:'
      ? https
      : target.protocol === 'http:'
        ? http
        : null
  if (!transport) {
    return Promise.reject(
      new Error(`Unsupported protocol for safeFetch: ${target.protocol}`)
    )
  }

  const headers: Record<string, string> = {}
  new Headers(init.headers).forEach((value, key) => {
    headers[key] = value
  })
  if (!headers['accept-encoding']) {
    headers['accept-encoding'] = 'gzip, deflate, br'
  }

  const body = typeof init.body === 'string' ? init.body : undefined
  if (init.body !== undefined && init.body !== null && body === undefined) {
    return Promise.reject(new Error('safeFetch only supports string bodies'))
  }

  return new Promise<Response>((resolve, reject) => {
    const req = transport.request(
      url,
      {
        method: init.method ?? 'GET',
        headers,
        lookup: lookup as never,
        signal: init.signal ?? undefined,
      },
      res => {
        const responseHeaders = new Headers()
        for (const [key, value] of Object.entries(res.headers)) {
          if (Array.isArray(value)) {
            value.forEach(v => responseHeaders.append(key, v))
          } else if (value !== undefined) {
            responseHeaders.set(key, value)
          }
        }

        const status = res.statusCode ?? 0
        const encoding = String(res.headers['content-encoding'] ?? '')
          .toLowerCase()
          .trim()
        const decoder = decoderFor(encoding)
        let source: Readable = res
        if (decoder) {
          responseHeaders.delete('content-encoding')
          responseHeaders.delete('content-length')
          res.on('error', err => decoder.destroy(err))
          source = res.pipe(decoder)
        }

        const nullBody = [101, 204, 205, 304].includes(status)
        if (nullBody) res.resume()

        resolve(
          new Response(
            nullBody ? null : (Readable.toWeb(source) as ReadableStream),
            {
              status,
              statusText: res.statusMessage ?? '',
              headers: responseHeaders,
            }
          )
        )
      }
    )
    req.on('error', reject)
    req.end(body)
  })
}

/**
 * Guarded fetch. Validates the target (and every redirect hop) against SSRF
 * targets before issuing the request, pins the connection to validated
 * addresses, and follows 3xx redirects manually up to `maxRedirects`
 * (default 5), carrying method/headers/body/signal across hops.
 */
export async function safeFetch(
  url: string,
  init?: RequestInit & { maxRedirects?: number }
): Promise<Response> {
  const { maxRedirects = DEFAULT_MAX_REDIRECTS, ...requestInit } = init ?? {}
  const useGlobalFetch = process.env.NODE_ENV === 'test'
  const lookup = useGlobalFetch ? null : createPinnedLookup()

  let currentUrl = url

  // One initial request plus up to `maxRedirects` redirect hops.
  for (let hop = 0; hop <= maxRedirects; hop++) {
    assertNotSsrfTarget(currentUrl)

    const response = lookup
      ? await pinnedRequest(currentUrl, requestInit, lookup)
      : await fetch(currentUrl, { ...requestInit, redirect: 'manual' })

    const location = response.headers.get('location')
    const isRedirect =
      response.status >= 300 && response.status < 400 && location !== null

    if (!isRedirect || location === null) {
      return response
    }

    // Drop the unread redirect body so the socket is released.
    await response.body?.cancel().catch(() => undefined)

    // Resolve relative redirect targets against the current URL.
    currentUrl = new URL(location, currentUrl).toString()
  }

  throw new Error(
    `safeFetch: too many redirects (exceeded ${maxRedirects}) starting from ${url}`
  )
}
