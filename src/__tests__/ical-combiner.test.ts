import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { combineICalFeeds } from '@/lib/ical-combiner'
import { CalendarSource } from '@/types/calendar'

// Helpers to build iCal fixture strings
function makeEvent(uid: string, summary: string): string {
  return [
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `SUMMARY:${summary}`,
    'DTSTART:20240101T090000Z',
    'DTEND:20240101T100000Z',
    'END:VEVENT',
  ].join('\r\n')
}

function makeRecurrenceOverride(
  uid: string,
  recurrenceId: string,
  summary: string
): string {
  return [
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `RECURRENCE-ID:${recurrenceId}`,
    `SUMMARY:${summary}`,
    'DTSTART:20240101T090000Z',
    'DTEND:20240101T100000Z',
    'END:VEVENT',
  ].join('\r\n')
}

function makeTimezone(tzid: string): string {
  return [
    'BEGIN:VTIMEZONE',
    `TZID:${tzid}`,
    'BEGIN:STANDARD',
    'DTSTART:19700101T000000',
    'TZOFFSETFROM:+1100',
    'TZOFFSETTO:+1000',
    'END:STANDARD',
    'END:VTIMEZONE',
  ].join('\r\n')
}

function makeCalendar(events: string[], timezones: string[] = []): string {
  const parts = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Test//Test//EN',
    ...timezones,
    ...events,
    'END:VCALENDAR',
  ]
  return parts.join('\r\n')
}

function makeSource(
  url: string,
  overrides: Partial<CalendarSource> = {}
): CalendarSource {
  return {
    id: 1,
    url,
    name: 'Test Calendar',
    color: '#3b82f6',
    enabled: true,
    createdAt: new Date().toISOString(),
    syncStatus: 'idle',
    ...overrides,
  }
}

/** Build a Response-like object that safeFetch will pass through (no 3xx). */
function makeOkResponse(content: string): Response {
  return new Response(content, {
    status: 200,
    headers: { 'Content-Type': 'text/calendar' },
  })
}

function makeErrorResponse(status: number, body = ''): Response {
  return new Response(body, { status })
}

describe('combineICalFeeds', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  function mockFetchError(message: string) {
    vi.mocked(fetch).mockRejectedValue(new Error(message))
  }

  describe('empty / disabled calendars', () => {
    it('returns error when calendars array is empty', async () => {
      const result = await combineICalFeeds([])
      expect(result.success).toBe(false)
      expect(result.errors).toContain('No calendars provided')
    })

    it('returns error when all calendars are disabled', async () => {
      const sources = [
        makeSource('https://example.com/cal.ics', { enabled: false }),
      ]
      const result = await combineICalFeeds(sources)
      expect(result.success).toBe(false)
      expect(result.errors).toContain('No enabled calendars found')
    })

    it('skips disabled calendars and only fetches enabled ones', async () => {
      const event = makeEvent('uid-1@test', 'Active Event')
      vi.mocked(fetch).mockResolvedValue(makeOkResponse(makeCalendar([event])))

      const sources = [
        makeSource('https://example.com/active.ics', { enabled: true }),
        makeSource('https://example.com/disabled.ics', { enabled: false }),
      ]

      const result = await combineICalFeeds(sources)

      expect(result.success).toBe(true)
      expect(fetch).toHaveBeenCalledTimes(1)
      expect(vi.mocked(fetch).mock.calls[0]?.[0]).toBe(
        'https://example.com/active.ics'
      )
    })
  })

  describe('successful combining', () => {
    it('combines a single calendar', async () => {
      const event = makeEvent('uid-1@test', 'Meeting')
      vi.mocked(fetch).mockResolvedValue(makeOkResponse(makeCalendar([event])))

      const result = await combineICalFeeds([
        makeSource('https://example.com/cal.ics'),
      ])

      expect(result.success).toBe(true)
      expect(result.eventsCount).toBe(1)
      expect(result.calendarsProcessed).toBe(1)
      expect(result.icalContent).toContain('BEGIN:VCALENDAR')
      expect(result.icalContent).toContain('END:VCALENDAR')
      expect(result.icalContent).toContain('UID:uid-1@test')
      expect(result.icalContent).toContain('SUMMARY:Meeting')
    })

    it('combines events from multiple calendars', async () => {
      const event1 = makeEvent('uid-1@test', 'Event One')
      const event2 = makeEvent('uid-2@test', 'Event Two')

      vi.mocked(fetch)
        .mockResolvedValueOnce(makeOkResponse(makeCalendar([event1])))
        .mockResolvedValueOnce(makeOkResponse(makeCalendar([event2])))

      const sources = [
        makeSource('https://example.com/cal1.ics', { id: 1 }),
        makeSource('https://example.com/cal2.ics', { id: 2 }),
      ]

      const result = await combineICalFeeds(sources)

      expect(result.success).toBe(true)
      expect(result.eventsCount).toBe(2)
      expect(result.calendarsProcessed).toBe(2)
      expect(result.icalContent).toContain('uid-1@test')
      expect(result.icalContent).toContain('uid-2@test')
    })

    it('deduplicates events with the same UID', async () => {
      const uid = 'duplicate-uid@test'
      const event1 = makeEvent(uid, 'Original')
      const event2 = makeEvent(uid, 'Duplicate')

      vi.mocked(fetch)
        .mockResolvedValueOnce(makeOkResponse(makeCalendar([event1])))
        .mockResolvedValueOnce(makeOkResponse(makeCalendar([event2])))

      const sources = [
        makeSource('https://example.com/cal1.ics', { id: 1 }),
        makeSource('https://example.com/cal2.ics', { id: 2 }),
      ]

      const result = await combineICalFeeds(sources)

      expect(result.success).toBe(true)
      expect(result.eventsCount).toBe(1)
      // First occurrence kept
      expect(result.icalContent).toContain('SUMMARY:Original')
      expect(result.icalContent).not.toContain('SUMMARY:Duplicate')
      expect(result.warnings.some(w => w.includes('duplicate'))).toBe(true)
    })

    it('deduplicates timezones with the same TZID', async () => {
      const tz = makeTimezone('Australia/Sydney')
      const event1 = makeEvent('uid-1@test', 'Event One')
      const event2 = makeEvent('uid-2@test', 'Event Two')

      vi.mocked(fetch)
        .mockResolvedValueOnce(makeOkResponse(makeCalendar([event1], [tz])))
        .mockResolvedValueOnce(makeOkResponse(makeCalendar([event2], [tz])))

      const sources = [
        makeSource('https://example.com/cal1.ics', { id: 1 }),
        makeSource('https://example.com/cal2.ics', { id: 2 }),
      ]

      const result = await combineICalFeeds(sources)

      expect(result.success).toBe(true)
      // VTIMEZONE block should appear exactly once
      const tzMatches = result.icalContent.match(/BEGIN:VTIMEZONE/g)
      expect(tzMatches).toHaveLength(1)
    })

    it('places timezones before events in the output', async () => {
      const tz = makeTimezone('Europe/London')
      const event = makeEvent('uid-1@test', 'London Meeting')
      vi.mocked(fetch).mockResolvedValue(
        makeOkResponse(makeCalendar([event], [tz]))
      )

      const result = await combineICalFeeds([
        makeSource('https://example.com/cal.ics'),
      ])

      expect(result.success).toBe(true)
      const tzPos = result.icalContent.indexOf('BEGIN:VTIMEZONE')
      const eventPos = result.icalContent.indexOf('BEGIN:VEVENT')
      expect(tzPos).toBeLessThan(eventPos)
    })

    it('output starts with VCALENDAR header and ends with footer', async () => {
      vi.mocked(fetch).mockResolvedValue(
        makeOkResponse(makeCalendar([makeEvent('uid-1@test', 'Event')]))
      )

      const result = await combineICalFeeds([
        makeSource('https://example.com/cal.ics'),
      ])

      expect(result.icalContent.startsWith('BEGIN:VCALENDAR')).toBe(true)
      expect(result.icalContent.trimEnd().endsWith('END:VCALENDAR')).toBe(true)
      expect(result.icalContent).toContain('VERSION:2.0')
      expect(result.icalContent).toContain('PRODID:')
    })

    it('warns when a calendar has no events', async () => {
      vi.mocked(fetch).mockResolvedValue(makeOkResponse(makeCalendar([])))

      const result = await combineICalFeeds([
        makeSource('https://example.com/cal.ics', { name: 'Empty Cal' }),
      ])

      // combineICalFeeds returns success=false when calendarsProcessed is 0
      // but with an empty-but-valid calendar, it still fetches successfully
      expect(result.warnings.some(w => w.includes('Empty Cal'))).toBe(true)
    })
  })

  describe('fetch errors', () => {
    it('returns failure when all fetches fail', async () => {
      mockFetchError('Network error')

      const result = await combineICalFeeds([
        makeSource('https://example.com/cal.ics'),
      ])

      expect(result.success).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('partial failure: success===false, calendarsProcessed>0, non-empty icalContent', async () => {
      const event = makeEvent('uid-1@test', 'Good Event')

      vi.mocked(fetch)
        .mockResolvedValueOnce(makeOkResponse(makeCalendar([event])))
        .mockRejectedValueOnce(new Error('Network timeout'))

      const sources = [
        makeSource('https://example.com/good.ics', { id: 1 }),
        makeSource('https://example.com/bad.ics', { id: 2, name: 'Bad Cal' }),
      ]

      const result = await combineICalFeeds(sources)

      // Partial: one succeeded, one failed
      expect(result.success).toBe(false)
      expect(result.calendarsProcessed).toBe(1)
      expect(result.eventsCount).toBe(1)
      // icalContent must be populated for the route to serve HTTP 206
      expect(result.icalContent).toContain('BEGIN:VCALENDAR')
      expect(result.icalContent).toContain('Good Event')
      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.errors.some(e => e.includes('Bad Cal'))).toBe(true)
    })

    it('records error when server returns HTTP error status', async () => {
      vi.mocked(fetch).mockResolvedValue(makeErrorResponse(404, 'Not Found'))

      const result = await combineICalFeeds([
        makeSource('https://example.com/cal.ics', { name: 'Missing Cal' }),
      ])

      expect(result.success).toBe(false)
      expect(result.errors.some(e => e.includes('Missing Cal'))).toBe(true)
    })

    it('records error when response is not valid iCal', async () => {
      vi.mocked(fetch).mockResolvedValue(
        new Response('<html>Not a calendar</html>', {
          status: 200,
          headers: { 'Content-Type': 'text/html' },
        })
      )

      const result = await combineICalFeeds([
        makeSource('https://example.com/cal.ics', { name: 'HTML Cal' }),
      ])

      expect(result.success).toBe(false)
      expect(result.errors.some(e => e.includes('HTML Cal'))).toBe(true)
    })
  })

  describe('recurrence-aware deduplication', () => {
    it('keeps recurring-event overrides (same UID, different RECURRENCE-ID) as distinct events', async () => {
      const uid = 'recurring-uid@test'
      const masterEvent = makeEvent(uid, 'Weekly Standup')
      const override = makeRecurrenceOverride(
        uid,
        '20240108T090000Z',
        'Weekly Standup (rescheduled)'
      )

      vi.mocked(fetch).mockResolvedValue(
        makeOkResponse(makeCalendar([masterEvent, override]))
      )

      const result = await combineICalFeeds([
        makeSource('https://example.com/cal.ics'),
      ])

      expect(result.success).toBe(true)
      // Both the master and the override must appear
      expect(result.eventsCount).toBe(2)
      expect(result.icalContent).toContain('SUMMARY:Weekly Standup\r\n')
      expect(result.icalContent).toContain('SUMMARY:Weekly Standup (rescheduled)')
    })

    it('deduplicates exact-duplicate events (same UID, same RECURRENCE-ID) across calendars', async () => {
      const uid = 'shared-override@test'
      const override = makeRecurrenceOverride(
        uid,
        '20240108T090000Z',
        'Override Event'
      )

      vi.mocked(fetch)
        .mockResolvedValueOnce(makeOkResponse(makeCalendar([override])))
        .mockResolvedValueOnce(makeOkResponse(makeCalendar([override])))

      const sources = [
        makeSource('https://example.com/cal1.ics', { id: 1 }),
        makeSource('https://example.com/cal2.ics', { id: 2 }),
      ]

      const result = await combineICalFeeds(sources)

      expect(result.success).toBe(true)
      // Exact duplicate: should appear only once
      expect(result.eventsCount).toBe(1)
      expect(result.warnings.some(w => w.includes('duplicate'))).toBe(true)
    })

    it('keeps overrides with different RECURRENCE-IDs for the same base event', async () => {
      const uid = 'multi-override@test'
      const master = makeEvent(uid, 'Team Meeting')
      const override1 = makeRecurrenceOverride(
        uid,
        '20240108T090000Z',
        'Team Meeting (Jan 8 override)'
      )
      const override2 = makeRecurrenceOverride(
        uid,
        '20240115T090000Z',
        'Team Meeting (Jan 15 override)'
      )

      vi.mocked(fetch).mockResolvedValue(
        makeOkResponse(makeCalendar([master, override1, override2]))
      )

      const result = await combineICalFeeds([
        makeSource('https://example.com/cal.ics'),
      ])

      expect(result.success).toBe(true)
      expect(result.eventsCount).toBe(3)
    })
  })

  describe('size / DoS guard', () => {
    it('rejects a source whose response exceeds MAX_SOURCE_BYTES', async () => {
      // Build a response just over 5 MB
      const bigContent =
        'BEGIN:VCALENDAR\r\nVERSION:2.0\r\n' +
        'X-JUNK:' +
        'A'.repeat(25_000_001) +
        '\r\nEND:VCALENDAR'

      vi.mocked(fetch).mockResolvedValue(makeOkResponse(bigContent))

      const result = await combineICalFeeds([
        makeSource('https://example.com/huge.ics', { name: 'Huge Cal' }),
      ])

      expect(result.success).toBe(false)
      expect(result.errors.some(e => e.includes('Huge Cal'))).toBe(true)
      expect(
        result.errors.some(e => e.toLowerCase().includes('large') || e.toLowerCase().includes('limit'))
      ).toBe(true)
    })

    it('truncates combined events when MAX_TOTAL_EVENTS is exceeded', async () => {
      // Build a calendar with 50,001 events — one over the cap.
      const eventCount = 50_001
      const events: string[] = []
      for (let i = 0; i < eventCount; i++) {
        events.push(makeEvent(`uid-${i}@test`, `Event ${i}`))
      }
      const calContent = makeCalendar(events)

      vi.mocked(fetch).mockResolvedValue(makeOkResponse(calContent))

      const result = await combineICalFeeds([
        makeSource('https://example.com/cal.ics'),
      ])

      // Success because the single source fetched OK; events are capped.
      expect(result.success).toBe(true)
      expect(result.eventsCount).toBe(50_000)
      expect(result.warnings.some(w => w.includes('cap') || w.includes('truncated'))).toBe(
        true
      )
    })
  })

  describe('result structure', () => {
    it('initialises counts to zero on empty-calendar failure', async () => {
      const result = await combineICalFeeds([])
      expect(result.eventsCount).toBe(0)
      expect(result.calendarsProcessed).toBe(0)
      expect(result.icalContent).toBe('')
      expect(Array.isArray(result.errors)).toBe(true)
      expect(Array.isArray(result.warnings)).toBe(true)
    })

    it('returns correct event count across multiple calendars', async () => {
      const events1 = [
        makeEvent('uid-a@test', 'A'),
        makeEvent('uid-b@test', 'B'),
      ]
      const events2 = [makeEvent('uid-c@test', 'C')]

      vi.mocked(fetch)
        .mockResolvedValueOnce(makeOkResponse(makeCalendar(events1)))
        .mockResolvedValueOnce(makeOkResponse(makeCalendar(events2)))

      const sources = [
        makeSource('https://example.com/cal1.ics', { id: 1 }),
        makeSource('https://example.com/cal2.ics', { id: 2 }),
      ]

      const result = await combineICalFeeds(sources)

      expect(result.eventsCount).toBe(3)
    })
  })
})
