import { describe, it, expect, beforeAll } from 'vitest'
import nextConfig from '../../next.config'

type HeaderEntry = { key: string; value: string }
type HeaderRule = { source: string; headers: HeaderEntry[] }

let catchAllHeaders: HeaderEntry[]

beforeAll(async () => {
  const headersFn = nextConfig.headers
  if (!headersFn) {
    throw new Error('next.config.ts does not define a headers() function')
  }

  const rules = (await headersFn()) as HeaderRule[]
  const catchAllRule = rules.find(rule => rule.source === '/(.*)')

  if (!catchAllRule) {
    throw new Error('No catch-all header rule found for source "/(.*)"')
  }

  catchAllHeaders = catchAllRule.headers
})

function getHeader(key: string): string | undefined {
  return catchAllHeaders.find(header => header.key === key)?.value
}

describe('next.config.ts headers()', () => {
  it('sets X-Frame-Options to DENY', () => {
    expect(getHeader('X-Frame-Options')).toBe('DENY')
  })

  it('sets X-Content-Type-Options to nosniff', () => {
    expect(getHeader('X-Content-Type-Options')).toBe('nosniff')
  })

  it('sets Referrer-Policy', () => {
    expect(getHeader('Referrer-Policy')).toBe('strict-origin-when-cross-origin')
  })

  it('sets X-DNS-Prefetch-Control to off', () => {
    expect(getHeader('X-DNS-Prefetch-Control')).toBe('off')
  })

  it('sets a Strict-Transport-Security header with a long max-age', () => {
    const hsts = getHeader('Strict-Transport-Security')
    expect(hsts).toBeDefined()
    expect(hsts).toContain('max-age=31536000')
    expect(hsts).toContain('includeSubDomains')
  })

  it('sets a restrictive Permissions-Policy', () => {
    const permissionsPolicy = getHeader('Permissions-Policy')
    expect(permissionsPolicy).toBeDefined()
    expect(permissionsPolicy).toContain('camera=()')
    expect(permissionsPolicy).toContain('microphone=()')
    expect(permissionsPolicy).toContain('geolocation=()')
  })

  describe('Content-Security-Policy', () => {
    it('is defined', () => {
      expect(getHeader('Content-Security-Policy')).toBeDefined()
    })

    it('allows Google Tag Manager for scripts', () => {
      expect(getHeader('Content-Security-Policy')).toContain(
        'https://www.googletagmanager.com'
      )
    })

    it('allows Google Analytics for connections', () => {
      expect(getHeader('Content-Security-Policy')).toContain(
        'https://www.google-analytics.com'
      )
    })

    it('restricts frame-ancestors to none', () => {
      expect(getHeader('Content-Security-Policy')).toContain(
        "frame-ancestors 'none'"
      )
    })
  })

  it('applies to the catch-all source, covering API routes too', () => {
    // next.config.ts headers() is the single source of truth for security
    // headers; the catch-all "/(.*)" source must cover /api/* routes since
    // src/middleware.ts (which used to exclude /api/*) was removed.
    expect(catchAllHeaders.length).toBeGreaterThan(0)
  })
})
