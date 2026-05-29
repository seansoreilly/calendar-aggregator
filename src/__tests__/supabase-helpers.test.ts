import { describe, it, expect } from 'vitest'
import { escapeLikePattern, applyGuidFilter } from '@/lib/supabase'

describe('escapeLikePattern', () => {
  it('leaves normal slugs untouched', () => {
    expect(escapeLikePattern('seansoreilly')).toBe('seansoreilly')
    expect(escapeLikePattern('my-calendar')).toBe('my-calendar')
    expect(escapeLikePattern('abc123')).toBe('abc123')
  })

  it('escapes underscore so it matches literally', () => {
    expect(escapeLikePattern('sean_oreilly')).toBe('sean\\_oreilly')
    expect(escapeLikePattern('a_b_c')).toBe('a\\_b\\_c')
    expect(escapeLikePattern('_leading')).toBe('\\_leading')
    expect(escapeLikePattern('trailing_')).toBe('trailing\\_')
  })

  it('escapes percent sign', () => {
    expect(escapeLikePattern('100%')).toBe('100\\%')
    expect(escapeLikePattern('%start')).toBe('\\%start')
    expect(escapeLikePattern('a%b%c')).toBe('a\\%b\\%c')
  })

  it('escapes backslash first to avoid double-escaping', () => {
    expect(escapeLikePattern('a\\b')).toBe('a\\\\b')
    // A string with backslash + underscore: both must be escaped,
    // and backslash must not be double-escaped after underscore escaping
    expect(escapeLikePattern('a\\_b')).toBe('a\\\\\\_b')
  })

  it('handles mixed special characters', () => {
    expect(escapeLikePattern('a%b_c\\d')).toBe('a\\%b\\_c\\\\d')
  })

  it('handles empty string', () => {
    expect(escapeLikePattern('')).toBe('')
  })
})

describe('applyGuidFilter', () => {
  // Minimal mock that records which filter method was called, satisfying the
  // GuidFilterable structural constraint used by applyGuidFilter.
  function makeBuilder() {
    const calls: { method: string; column: string; value: string }[] = []
    const builder = {
      calls,
      eq(column: string, value: string) {
        calls.push({ method: 'eq', column, value })
        return builder
      },
      ilike(column: string, value: string) {
        calls.push({ method: 'ilike', column, value })
        return builder
      },
    }
    return builder
  }

  it('uses eq for a UUID', () => {
    const b = makeBuilder()
    const uuid = '550e8400-e29b-41d4-a716-446655440000'
    applyGuidFilter(b, uuid)
    expect(b.calls).toHaveLength(1)
    expect(b.calls[0]).toEqual({ method: 'eq', column: 'guid', value: uuid })
  })

  it('uses ilike for a plain custom slug', () => {
    const b = makeBuilder()
    applyGuidFilter(b, 'seansoreilly')
    expect(b.calls).toHaveLength(1)
    expect(b.calls[0]).toEqual({
      method: 'ilike',
      column: 'guid',
      value: 'seansoreilly',
    })
  })

  it('escapes underscores in custom slugs before passing to ilike', () => {
    const b = makeBuilder()
    applyGuidFilter(b, 's_ansoreilly')
    expect(b.calls).toHaveLength(1)
    expect(b.calls[0]).toEqual({
      method: 'ilike',
      column: 'guid',
      value: 's\\_ansoreilly',
    })
  })

  it('escapes percent signs in custom slugs before passing to ilike', () => {
    const b = makeBuilder()
    applyGuidFilter(b, 'my%slug')
    expect(b.calls).toHaveLength(1)
    expect(b.calls[0]).toEqual({
      method: 'ilike',
      column: 'guid',
      value: 'my\\%slug',
    })
  })
})
