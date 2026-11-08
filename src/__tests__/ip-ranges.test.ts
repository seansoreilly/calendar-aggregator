import { describe, it, expect } from 'vitest'
import { isPrivateAddress, isIPLiteral } from '@/lib/ip-ranges'
import { assertNotSsrfTarget } from '@/lib/validation'
import { ValidationError } from '@/lib/errors'

describe('isPrivateAddress', () => {
  it.each([
    // IPv4
    '0.0.0.0',
    '0.1.2.3',
    '10.1.2.3',
    '100.64.0.1',
    '100.127.255.255',
    '127.0.0.1',
    '169.254.169.254',
    '172.16.0.1',
    '172.31.255.255',
    '192.0.0.1',
    '192.168.1.1',
    '198.18.0.1',
    '198.19.255.255',
    '224.0.0.1',
    '239.255.255.255',
    '240.0.0.1',
    '255.255.255.255',
    // IPv6 loopback / unspecified / compat / mapped
    '::1',
    '[::1]',
    '::',
    '[::]',
    '::7f00:1',
    '[::7f00:1]',
    '::127.0.0.1',
    '::ffff:127.0.0.1',
    '::ffff:7f00:1',
    '[::ffff:169.254.169.254]',
    '0:0:0:0:0:ffff:a00:1',
    // NAT64 / 6to4 embedding private v4
    '64:ff9b::7f00:1',
    '[64:ff9b::169.254.169.254]',
    '64:ff9b::a00:1',
    '64:ff9b:1::1',
    '2002:7f00:1::1',
    '[2002:a9fe:a9fe::1]',
    '2002:c0a8:101::',
    // ULA, link-local, multicast
    'fc00::1',
    'fd12:3456::1',
    'fe80::1',
    'febf::1',
    'fe80::1%eth0',
    'ff02::1',
    // other reserved
    '2001:db8::1',
    '2001::1',
    // hostnames
    'localhost',
    'localhost.',
    'LOCALHOST',
    'foo.localhost',
    'metadata.google.internal',
    'metadata.google.internal.',
  ])('blocks %s', host => {
    expect(isPrivateAddress(host)).toBe(true)
  })

  it.each([
    '8.8.8.8',
    '1.1.1.1',
    '100.63.255.255',
    '100.128.0.1',
    '172.15.255.255',
    '172.32.0.1',
    '192.0.1.1',
    '198.17.255.255',
    '198.20.0.1',
    '223.255.255.255',
    '2606:4700:4700::1111',
    '[2606:4700:4700::1111]',
    '2001:4860:4860::8888',
    '::ffff:8.8.8.8',
    '64:ff9b::808:808',
    '2002:808:808::1',
    'example.com',
    'calendar.google.com',
  ])('allows %s', host => {
    expect(isPrivateAddress(host)).toBe(false)
  })

  it('fails closed on malformed IPv6-looking input', () => {
    expect(isPrivateAddress('::g')).toBe(true)
    expect(isPrivateAddress('1:2:3:4:5:6:7:8:9')).toBe(true)
  })
})

describe('isIPLiteral', () => {
  it('detects v4 and bracketed/bare v6 literals but not names', () => {
    expect(isIPLiteral('1.2.3.4')).toBe(true)
    expect(isIPLiteral('[::1]')).toBe(true)
    expect(isIPLiteral('::1')).toBe(true)
    expect(isIPLiteral('example.com')).toBe(false)
  })
})

describe('assertNotSsrfTarget (extended forms)', () => {
  it.each([
    'http://[::1]/',
    'http://[::7f00:1]/',
    'http://[::ffff:7f00:1]/',
    'http://[64:ff9b::7f00:1]/',
    'http://[2002:7f00:1::]/',
    'http://localhost./',
    'http://LOCALHOST./cal.ics',
    'http://0.0.0.0/',
    'http://0x7f.1/',
    'http://2130706433/',
    'http://198.18.0.1/',
    'http://192.0.0.8/',
    'http://224.0.0.1/',
    'http://240.0.0.1/',
    'http://[ff02::1]/',
  ])('rejects %s', url => {
    expect(() => assertNotSsrfTarget(url)).toThrow(ValidationError)
  })

  it('allows public literals and names', () => {
    expect(() => assertNotSsrfTarget('http://8.8.8.8/')).not.toThrow()
    expect(() =>
      assertNotSsrfTarget('https://[2606:4700:4700::1111]/')
    ).not.toThrow()
    expect(() => assertNotSsrfTarget('https://example.com./')).not.toThrow()
  })
})
