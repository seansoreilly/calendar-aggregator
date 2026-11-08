/**
 * Pure-TypeScript IP classification used by the SSRF guards.
 *
 * Deliberately has no Node imports so it stays safe to bundle in client code
 * (`validation.ts` is reachable from `utils.ts`).
 *
 * `isPrivateAddress` accepts a URL hostname (IPv6 literals bracketed, as
 * `URL.hostname` returns them), a bare IPv6 literal (as returned by DNS), an
 * IPv4 dotted quad, or a DNS name. IP literals are parsed and range-checked
 * numerically; non-IP names are only checked against a small blocklist.
 */

const BLOCKED_HOSTNAMES = new Set(['localhost', 'metadata.google.internal'])

/** IPv4 CIDR blocks that must never be fetched: [network, prefix length]. */
const BLOCKED_V4: ReadonlyArray<readonly [string, number]> = [
  ['0.0.0.0', 8], // "this network"
  ['10.0.0.0', 8], // private
  ['100.64.0.0', 10], // CGNAT
  ['127.0.0.0', 8], // loopback
  ['169.254.0.0', 16], // link-local (cloud metadata)
  ['172.16.0.0', 12], // private
  ['192.0.0.0', 24], // IETF protocol assignments
  ['192.0.2.0', 24], // TEST-NET-1
  ['192.168.0.0', 16], // private
  ['198.18.0.0', 15], // benchmarking
  ['198.51.100.0', 24], // TEST-NET-2
  ['203.0.113.0', 24], // TEST-NET-3
  ['224.0.0.0', 4], // multicast
  ['240.0.0.0', 4], // reserved + limited broadcast
]

export function parseIPv4(text: string): number | null {
  const parts = text.split('.')
  if (parts.length !== 4) return null
  let value = 0
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null
    const n = Number(part)
    if (n > 255) return null
    value = value * 256 + n
  }
  return value
}

function inV4Cidr(ip: number, network: string, prefix: number): boolean {
  const net = parseIPv4(network) as number
  const size = 2 ** (32 - prefix)
  return Math.floor(ip / size) === Math.floor(net / size)
}

export function isPrivateIPv4(ip: number): boolean {
  return BLOCKED_V4.some(([network, prefix]) => inV4Cidr(ip, network, prefix))
}

/** Parses an IPv6 literal (no brackets/zone) into 8 16-bit groups. */
export function parseIPv6(text: string): number[] | null {
  if (!/^[0-9a-f:.]+$/i.test(text) || !text.includes(':')) return null

  let work = text
  // Trailing dotted-quad (e.g. ::ffff:127.0.0.1) -> two hex groups.
  const lastColon = work.lastIndexOf(':')
  const tail = work.slice(lastColon + 1)
  if (tail.includes('.')) {
    const v4 = parseIPv4(tail)
    if (v4 === null) return null
    const hi = Math.floor(v4 / 65536).toString(16)
    const lo = (v4 % 65536).toString(16)
    work = `${work.slice(0, lastColon + 1)}${hi}:${lo}`
  }

  const halves = work.split('::')
  if (halves.length > 2) return null
  const parse = (s: string): number[] | null => {
    if (s === '') return []
    const out: number[] = []
    for (const g of s.split(':')) {
      if (!/^[0-9a-f]{1,4}$/i.test(g)) return null
      out.push(parseInt(g, 16))
    }
    return out
  }
  const head = parse(halves[0] as string)
  if (!head) return null
  if (halves.length === 1) return head.length === 8 ? head : null
  const rest = parse(halves[1] as string)
  if (!rest) return null
  const missing = 8 - head.length - rest.length
  if (missing < 1) return null
  return [...head, ...new Array<number>(missing).fill(0), ...rest]
}

function v4FromGroups(hi: number, lo: number): number {
  return hi * 65536 + lo
}

export function isPrivateIPv6(g: number[]): boolean {
  const [g0, g1, g2, g3, g4, g5, g6, g7] = g as [
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
  ]
  const firstFiveZero = g0 === 0 && g1 === 0 && g2 === 0 && g3 === 0 && g4 === 0

  // ::/96 - unspecified, loopback and deprecated IPv4-compatible (::7f00:1).
  if (firstFiveZero && g5 === 0) return true
  // ::ffff:0:0/96 - IPv4-mapped.
  if (firstFiveZero && g5 === 0xffff) {
    return isPrivateIPv4(v4FromGroups(g6, g7))
  }
  // 64:ff9b::/96 - NAT64 well-known prefix embeds a v4 address.
  if (
    g0 === 0x64 &&
    g1 === 0xff9b &&
    g2 === 0 &&
    g3 === 0 &&
    g4 === 0 &&
    g5 === 0
  ) {
    return isPrivateIPv4(v4FromGroups(g6, g7))
  }
  // 64:ff9b:1::/48 - local-use NAT64.
  if (g0 === 0x64 && g1 === 0xff9b && g2 === 1) return true
  // 2002::/16 - 6to4 embeds a v4 address in groups 1-2.
  if (g0 === 0x2002) return isPrivateIPv4(v4FromGroups(g1, g2))
  // 2001::/32 Teredo (embeds v4 / client address), 2001:db8::/32 documentation.
  if (g0 === 0x2001 && (g1 === 0 || g1 === 0xdb8)) return true
  // 100::/64 discard-only.
  if (g0 === 0x100 && g1 === 0 && g2 === 0 && g3 === 0) return true
  // fc00::/7 unique local.
  if ((g0 & 0xfe00) === 0xfc00) return true
  // fe80::/10 link-local, fec0::/10 deprecated site-local.
  if ((g0 & 0xffc0) === 0xfe80 || (g0 & 0xffc0) === 0xfec0) return true
  // ff00::/8 multicast.
  if ((g0 & 0xff00) === 0xff00) return true
  return false
}

/**
 * Strips URL-style brackets, an IPv6 zone id and a trailing root dot, and
 * lowercases. Returns the bare host text.
 */
export function normalizeHost(host: string): string {
  let h = host.trim().toLowerCase()
  if (h.startsWith('[') && h.endsWith(']')) h = h.slice(1, -1)
  const zone = h.indexOf('%')
  if (zone !== -1) h = h.slice(0, zone)
  while (h.endsWith('.')) h = h.slice(0, -1)
  return h
}

/** True when `host` is an IP literal (v4 or v6) after normalisation. */
export function isIPLiteral(host: string): boolean {
  const h = normalizeHost(host)
  return parseIPv4(h) !== null || parseIPv6(h) !== null
}

export function isPrivateAddress(host: string): boolean {
  const h = normalizeHost(host)

  if (BLOCKED_HOSTNAMES.has(h) || h.endsWith('.localhost')) return true

  const v4 = parseIPv4(h)
  if (v4 !== null) return isPrivateIPv4(v4)

  const v6 = parseIPv6(h)
  if (v6 !== null) return isPrivateIPv6(v6)

  // Looks like an IP but did not parse: refuse rather than guess.
  if (h.includes(':')) return true

  return false
}
