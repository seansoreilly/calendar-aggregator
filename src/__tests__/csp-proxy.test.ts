import { describe, it, expect } from 'vitest'
import { NextRequest } from 'next/server'
import { buildCsp } from '../lib/csp'
import { proxy } from '../proxy'

function scriptSrc(csp: string): string {
  return csp.split('; ').find(part => part.startsWith('script-src ')) ?? ''
}

describe('buildCsp', () => {
  it('uses a nonce and strict-dynamic with no unsafe-inline/unsafe-eval in production', () => {
    const src = scriptSrc(buildCsp('abc123', false))
    expect(src).toContain("'nonce-abc123'")
    expect(src).toContain("'strict-dynamic'")
    expect(src).toContain('https://www.googletagmanager.com')
    expect(src).not.toContain('unsafe-inline')
    expect(src).not.toContain('unsafe-eval')
  })

  it("allows 'unsafe-eval' only in development", () => {
    expect(scriptSrc(buildCsp('n', true))).toContain("'unsafe-eval'")
  })

  it('keeps the other directives', () => {
    const csp = buildCsp('n', false)
    expect(csp).toContain("frame-ancestors 'none'")
    expect(csp).toContain('https://www.google-analytics.com')
    expect(csp).toContain("style-src 'self' 'unsafe-inline'")
  })
})

describe('proxy', () => {
  it('sets a fresh nonce CSP per request and forwards x-nonce', () => {
    const a = proxy(new NextRequest('http://localhost/'))
    const b = proxy(new NextRequest('http://localhost/api/calendar/x'))
    const cspA = a.headers.get('Content-Security-Policy') ?? ''
    const cspB = b.headers.get('Content-Security-Policy') ?? ''
    expect(cspA).toMatch(/'nonce-[^']+'/)
    expect(cspA).not.toBe(cspB)
    expect(a.headers.get('x-middleware-request-x-nonce')).toBeTruthy()
  })
})
