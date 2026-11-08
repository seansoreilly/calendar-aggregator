import { describe, it, expect } from 'vitest'
import { mapSettledWithConcurrency } from '@/lib/concurrency'

describe('mapSettledWithConcurrency', () => {
  it('never exceeds the limit and preserves order', async () => {
    let active = 0
    let peak = 0
    const results = await mapSettledWithConcurrency(
      Array.from({ length: 12 }, (_, i) => i),
      3,
      async i => {
        active++
        peak = Math.max(peak, active)
        await new Promise(r => setTimeout(r, 5))
        active--
        return i * 2
      }
    )
    expect(peak).toBe(3)
    expect(results.map(r => (r.status === 'fulfilled' ? r.value : -1))).toEqual(
      Array.from({ length: 12 }, (_, i) => i * 2)
    )
  })

  it('captures rejections without aborting other tasks', async () => {
    const results = await mapSettledWithConcurrency([1, 2, 3], 2, async n => {
      if (n === 2) throw new Error('boom')
      return n
    })
    expect(results.map(r => r.status)).toEqual([
      'fulfilled',
      'rejected',
      'fulfilled',
    ])
  })

  it('handles empty input', async () => {
    expect(await mapSettledWithConcurrency([], 5, async () => 1)).toEqual([])
  })
})
