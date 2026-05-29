import { describe, it, expect } from 'vitest'
import {
  assertNotSsrfTarget,
  validateCalendarSourceUrl,
  validateCollectionName,
  validateCollectionDescription,
} from '@/lib/validation'
import { ValidationError } from '@/lib/errors'

describe('assertNotSsrfTarget', () => {
  describe('blocks private IPv4 ranges', () => {
    it.each([
      ['loopback', 'http://127.0.0.1/'],
      ['loopback high', 'http://127.255.255.255/'],
      ['RFC1918 10.x', 'http://10.0.0.1/'],
      ['RFC1918 10.x high', 'http://10.255.255.255/'],
      ['RFC1918 172.16', 'http://172.16.0.1/'],
      ['RFC1918 172.31', 'http://172.31.255.255/'],
      ['RFC1918 192.168', 'http://192.168.1.1/'],
      ['link-local / AWS IMDS', 'http://169.254.169.254/'],
      ['link-local', 'http://169.254.0.1/'],
      ['0.0.0.0', 'http://0.0.0.1/'],
    ])('%s (%s)', (_, url) => {
      expect(() => assertNotSsrfTarget(url)).toThrow(ValidationError)
    })
  })

  describe('blocks private IPv6 addresses', () => {
    it.each([
      ['IPv6 loopback', 'http://[::1]/'],
      ['IPv6 unique local fc00', 'http://[fc00::1]/'],
      ['IPv6 unique local fd00', 'http://[fd00::1]/'],
      ['IPv6 unique local fd12', 'http://[fd12::1]/'],
      ['IPv6 link-local fe80', 'http://[fe80::1]/'],
      ['IPv6 unspecified', 'http://[::]/'],
      [
        'IPv4-mapped IMDS',
        'http://[::ffff:169.254.169.254]/',
      ],
      ['IPv4-mapped loopback', 'http://[::ffff:127.0.0.1]/'],
    ])('%s (%s)', (_, url) => {
      expect(() => assertNotSsrfTarget(url)).toThrow(ValidationError)
    })
  })

  describe('blocks additional reserved IPv4 ranges', () => {
    it.each([
      ['CGNAT 100.64.0.0/10 low', 'http://100.64.0.1/'],
      ['CGNAT 100.64.0.0/10 high', 'http://100.127.255.255/'],
      ['limited broadcast', 'http://255.255.255.255/'],
    ])('%s (%s)', (_, url) => {
      expect(() => assertNotSsrfTarget(url)).toThrow(ValidationError)
    })
  })

  describe('blocks reserved hostnames', () => {
    it.each([
      ['localhost', 'http://localhost/'],
      ['localhost with port', 'http://localhost:8080/admin'],
      ['GCE metadata', 'http://metadata.google.internal/'],
    ])('%s (%s)', (_, url) => {
      expect(() => assertNotSsrfTarget(url)).toThrow(ValidationError)
    })
  })

  describe('allows public URLs', () => {
    it.each([
      'https://calendar.google.com/calendar/ical/foo/basic.ics',
      'https://outlook.live.com/owa/calendar/abc/reachcalendar.ics',
      'http://example.com/cal.ics',
      'https://192-168-0-1.example.com/cal.ics', // hostname, not IP
    ])('%s', url => {
      expect(() => assertNotSsrfTarget(url)).not.toThrow()
    })
  })

  describe('does not block RFC1918-adjacent IPs', () => {
    it.each([
      ['172.15.x is public', 'http://172.15.255.255/'],
      ['172.32.x is public', 'http://172.32.0.1/'],
      ['11.x is public', 'http://11.0.0.1/'],
      ['191.168.x is public', 'http://191.168.0.1/'],
    ])('%s (%s)', (_, url) => {
      expect(() => assertNotSsrfTarget(url)).not.toThrow()
    })
  })
})

describe('validateCalendarSourceUrl', () => {
  it('rejects private IP URLs', () => {
    expect(() => validateCalendarSourceUrl('http://127.0.0.1/cal.ics')).toThrow(
      ValidationError
    )
    expect(() =>
      validateCalendarSourceUrl('http://169.254.169.254/latest/meta-data/')
    ).toThrow(ValidationError)
  })

  it('rejects non-http protocols', () => {
    expect(() =>
      validateCalendarSourceUrl('ftp://example.com/cal.ics')
    ).toThrow(ValidationError)
  })

  it('accepts valid public calendar URLs', () => {
    expect(() =>
      validateCalendarSourceUrl(
        'https://calendar.google.com/calendar/ical/foo/basic.ics'
      )
    ).not.toThrow()
  })

  it('accepts webcal URLs', () => {
    expect(() =>
      validateCalendarSourceUrl('webcal://example.com/cal.ics')
    ).not.toThrow()
  })
})

describe('validateCollectionName control-character rejection', () => {
  it.each([
    ['CR', 'Team\rCalendar'],
    ['LF', 'Team\nCalendar'],
    ['CRLF header injection', 'Calendar\r\nSet-Cookie: x=y'],
    ['tab', 'Team\tCalendar'],
    ['null byte', 'Team\x00Calendar'],
    ['DEL', 'Team\x7fCalendar'],
  ])('rejects %s in collection name', (_, name) => {
    expect(() => validateCollectionName(name)).toThrow(ValidationError)
  })

  it('accepts a clean collection name', () => {
    expect(() => validateCollectionName('My Calendar Set')).not.toThrow()
  })
})

describe('validateCollectionDescription control-character rejection', () => {
  it.each([
    ['CR', 'Line one\rLine two'],
    ['LF', 'Line one\nLine two'],
    ['CRLF header injection', 'desc\r\nSet-Cookie: x=y'],
    ['null byte', 'desc\x00'],
    ['DEL', 'desc\x7f'],
  ])('rejects %s in description', (_, description) => {
    expect(() => validateCollectionDescription(description)).toThrow(
      ValidationError
    )
  })

  it('accepts a clean description and undefined', () => {
    expect(() =>
      validateCollectionDescription('A normal description.')
    ).not.toThrow()
    expect(() => validateCollectionDescription(undefined)).not.toThrow()
  })
})
