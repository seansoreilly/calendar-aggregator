#!/usr/bin/env node
/**
 * Smoke-test a collection's combined iCal feed.
 *
 * Usage:
 *   node check-feed.mjs <guid> [--base <url>] [--query "<k=v&k=v>"] [--timeout <ms>]
 *
 * Exit 0 when all checks pass, 1 otherwise. No dependencies beyond Node 18+.
 */

const args = process.argv.slice(2)
const guid = args.find(
  (a, i) => !a.startsWith('--') && !args[i - 1]?.startsWith('--')
)

function flag(name, fallback) {
  const i = args.indexOf(`--${name}`)
  return i !== -1 && args[i + 1] !== undefined ? args[i + 1] : fallback
}

if (!guid) {
  console.error(
    'usage: check-feed.mjs <guid> [--base <url>] [--query "<k=v&k=v>"] [--timeout <ms>]'
  )
  process.exit(2)
}

const base = flag('base', 'http://localhost:3000').replace(/\/+$/, '')
const params = new URLSearchParams(flag('query', ''))
const timeout = flag('timeout')
if (timeout) params.set('timeout', timeout)
const qs = params.toString()
const url = `${base}/api/calendar/${encodeURIComponent(guid)}${qs ? `?${qs}` : ''}`

const results = []
function record(ok, label, detail = '') {
  results.push({ ok, label })
  const mark = ok === true ? 'PASS' : ok === 'warn' ? 'WARN' : 'FAIL'
  console.log(`${mark}  ${label}${detail ? ` — ${detail}` : ''}`)
}

function header(res, name) {
  return res.headers.get(name) ?? ''
}

async function main() {
  console.log(`feed: ${url}`)

  // 1. HEAD
  const head = await fetch(url, { method: 'HEAD' })
  record(head.status === 200, `HEAD status ${head.status}`)
  record(
    header(head, 'content-type').startsWith('text/calendar'),
    'HEAD content-type',
    header(head, 'content-type')
  )
  record(
    header(head, 'x-calendar-sources-count') !== '',
    'HEAD X-Calendar-Sources-Count',
    `${header(head, 'x-calendar-sources-count')} (${header(head, 'x-collection-name')})`
  )

  // 2. GET
  const get = await fetch(url)
  const body = await get.text()
  if (get.status === 206) {
    record(
      'warn',
      'GET status 206 (partial)',
      header(get, 'x-calendar-warnings')
    )
  } else {
    record(
      get.status === 200,
      `GET status ${get.status}`,
      get.ok ? '' : body.slice(0, 200)
    )
  }
  if (get.status !== 200 && get.status !== 206) {
    return finish()
  }

  record(
    header(get, 'content-type').startsWith('text/calendar'),
    'GET content-type',
    header(get, 'content-type')
  )

  // 3. Body framing
  const trimmed = body.trim()
  record(
    trimmed.startsWith('BEGIN:VCALENDAR'),
    'body starts with BEGIN:VCALENDAR'
  )
  record(trimmed.endsWith('END:VCALENDAR'), 'body ends with END:VCALENDAR')

  // 4. Event count
  const vevents = (body.match(/^BEGIN:VEVENT\r?$/gm) ?? []).length
  const declared = Number(header(get, 'x-calendar-events-count'))
  record(
    Number.isFinite(declared) && vevents === declared,
    'VEVENT count matches X-Calendar-Events-Count',
    `body=${vevents} header=${header(get, 'x-calendar-events-count')}`
  )
  console.log(
    `info  sources processed ${header(get, 'x-calendar-sources-processed')}/${header(get, 'x-calendar-sources-total')}`
  )

  // 5. Conditional GET
  const etag = header(get, 'etag')
  if (!etag) {
    record(false, 'ETag header present')
  } else {
    const cond = await fetch(url, { headers: { 'If-None-Match': etag } })
    const condBody = await cond.text()
    record(
      cond.status === 304 && condBody.length === 0,
      `conditional GET status ${cond.status}`,
      condBody.length ? `${condBody.length} bytes body` : 'empty body'
    )
  }

  return finish()
}

function finish() {
  const failed = results.filter(r => r.ok === false).length
  const warned = results.filter(r => r.ok === 'warn').length
  console.log(
    `summary: ${results.length - failed - warned} passed, ${warned} warned, ${failed} failed`
  )
  process.exit(failed ? 1 : 0)
}

main().catch(err => {
  console.error(`FAIL  request error — ${err?.cause?.message ?? err.message}`)
  process.exit(1)
})
