/** Maximum number of source calendars fetched/validated at the same time. */
export const SOURCE_FETCH_CONCURRENCY = 5

/**
 * Like `Promise.allSettled(items.map(fn))` but runs at most `limit` tasks at a
 * time. Results are index-ordered. `fn` is only invoked when a slot frees up,
 * so per-task timers started inside `fn` begin at that point.
 */
export async function mapSettledWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = new Array(items.length)
  let next = 0

  async function worker(): Promise<void> {
    while (next < items.length) {
      const index = next++
      try {
        results[index] = {
          status: 'fulfilled',
          value: await fn(items[index] as T, index),
        }
      } catch (reason) {
        results[index] = { status: 'rejected', reason }
      }
    }
  }

  const workers = Array.from(
    { length: Math.max(1, Math.min(limit, items.length)) },
    worker
  )
  await Promise.all(workers)
  return results
}
