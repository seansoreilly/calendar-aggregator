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

describe('combineICalFeeds', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  function mockFetch(content: string, status = 200) {
    vi.mocked(fetch).mockResolvedValue(
      new Response(content, {
        status,
        headers: { 'Content-Type': 'text/calendar' },
      })
    )
  }

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
      mockFetch(makeCalendar([event]))

      const sources = [
        makeSource('https://example.com/active.ics', { enabled: true }),
        makeSource('https://example.com/disabled.ics', { enabled: false }),
      ]

      const result = await combineICalFeeds(sources)

      expect(result.success).toBe(true)
      expect(fetch).toHaveBeenCalledTimes(1)
      expect(vi.mocked(fetch).mock.calls[0][0]).toBe(
        'https://example.com/active.ics'
      )
    })
  })

  describe('successful combining', () => {
    it('combines a single calendar', async () => {
      const event = makeEvent('uid-1@test', 'Meeting')
      mockFetch(makeCalendar([event]))

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
        .mockResolvedValueOnce(
          new Response(makeCalendar([event1]), {
            status: 200,
            headers: { 'Content-Type': 'text/calendar' },
          })
        )
        .mockResolvedValueOnce(
          new Response(makeCalendar([event2]), {
            status: 200,
            headers: { 'Content-Type': 'text/calendar' },
          })
        )

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
        .mockResolvedValueOnce(
          new Response(makeCalendar([event1]), {
            status: 200,
            headers: { 'Content-Type': 'text/calendar' },
          })
        )
        .mockResolvedValueOnce(
          new Response(makeCalendar([event2]), {
            status: 200,
            headers: { 'Content-Type': 'text/calendar' },
          })
        )

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
        .mockResolvedValueOnce(
          new Response(makeCalendar([event1], [tz]), {
            status: 200,
            headers: { 'Content-Type': 'text/calendar' },
          })
        )
        .mockResolvedValueOnce(
          new Response(makeCalendar([event2], [tz]), {
            status: 200,
            headers: { 'Content-Type': 'text/calendar' },
          })
        )

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
      mockFetch(makeCalendar([event], [tz]))

      const result = await combineICalFeeds([
        makeSource('https://example.com/cal.ics'),
      ])

      expect(result.success).toBe(true)
      const tzPos = result.icalContent.indexOf('BEGIN:VTIMEZONE')
      const eventPos = result.icalContent.indexOf('BEGIN:VEVENT')
      expect(tzPos).toBeLessThan(eventPos)
    })

    it('output starts with VCALENDAR header and ends with footer', async () => {
      mockFetch(makeCalendar([makeEvent('uid-1@test', 'Event')]))

      const result = await combineICalFeeds([
        makeSource('https://example.com/cal.ics'),
      ])

      expect(result.icalContent.startsWith('BEGIN:VCALENDAR')).toBe(true)
      expect(result.icalContent.trimEnd().endsWith('END:VCALENDAR')).toBe(true)
      expect(result.icalContent).toContain('VERSION:2.0')
      expect(result.icalContent).toContain('PRODID:')
    })

    it('warns when a calendar has no events', async () => {
      mockFetch(makeCalendar([]))

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

    it('returns partial success (206) content when some calendars fail', async () => {
      const event = makeEvent('uid-1@test', 'Good Event')

      vi.mocked(fetch)
        .mockResolvedValueOnce(
          new Response(makeCalendar([event]), {
            status: 200,
            headers: { 'Content-Type': 'text/calendar' },
          })
        )
        .mockRejectedValueOnce(new Error('Network timeout'))

      const sources = [
        makeSource('https://example.com/good.ics', { id: 1 }),
        makeSource('https://example.com/bad.ics', { id: 2, name: 'Bad Cal' }),
      ]

      const result = await combineICalFeeds(sources)

      expect(result.success).toBe(true)
      expect(result.calendarsProcessed).toBe(1)
      expect(result.eventsCount).toBe(1)
      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.errors.some(e => e.includes('Bad Cal'))).toBe(true)
    })

    it('records error when server returns HTTP error status', async () => {
      vi.mocked(fetch).mockResolvedValue(
        new Response('Not Found', { status: 404 })
      )

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
        .mockResolvedValueOnce(
          new Response(makeCalendar(events1), {
            status: 200,
            headers: { 'Content-Type': 'text/calendar' },
          })
        )
        .mockResolvedValueOnce(
          new Response(makeCalendar(events2), {
            status: 200,
            headers: { 'Content-Type': 'text/calendar' },
          })
        )

      const sources = [
        makeSource('https://example.com/cal1.ics', { id: 1 }),
        makeSource('https://example.com/cal2.ics', { id: 2 }),
      ]

      const result = await combineICalFeeds(sources)

      expect(result.eventsCount).toBe(3)
    })
  })
})
