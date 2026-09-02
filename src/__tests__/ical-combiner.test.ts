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
      expect(result.icalContent).toContain(
        'SUMMARY:Weekly Standup (rescheduled)'
      )
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
        result.errors.some(
          e =>
            e.toLowerCase().includes('large') ||
            e.toLowerCase().includes('limit')
        )
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
      expect(
        result.warnings.some(w => w.includes('cap') || w.includes('truncated'))
      ).toBe(true)
    })
  })

  describe('status field (tri-state)', () => {
    it("reports status 'ok' when every source fetches successfully", async () => {
      vi.mocked(fetch).mockResolvedValue(
        makeOkResponse(makeCalendar([makeEvent('uid-1@test', 'Event')]))
      )

      const result = await combineICalFeeds([
        makeSource('https://example.com/cal.ics'),
      ])

      expect(result.status).toBe('ok')
      expect(result.success).toBe(true)
    })

    it("reports status 'partial' when some sources fail but at least one succeeds", async () => {
      vi.mocked(fetch)
        .mockResolvedValueOnce(
          makeOkResponse(makeCalendar([makeEvent('uid-1@test', 'Good')]))
        )
        .mockRejectedValueOnce(new Error('Network timeout'))

      const result = await combineICalFeeds([
        makeSource('https://example.com/good.ics', { id: 1 }),
        makeSource('https://example.com/bad.ics', { id: 2 }),
      ])

      expect(result.status).toBe('partial')
      expect(result.success).toBe(false)
      expect(result.calendarsProcessed).toBe(1)
    })

    it("reports status 'failed' when no source can be fetched", async () => {
      mockFetchError('Network error')

      const result = await combineICalFeeds([
        makeSource('https://example.com/cal.ics'),
      ])

      expect(result.status).toBe('failed')
      expect(result.success).toBe(false)
      expect(result.calendarsProcessed).toBe(0)
    })

    it("reports status 'failed' on empty / disabled input", async () => {
      const empty = await combineICalFeeds([])
      expect(empty.status).toBe('failed')

      const disabled = await combineICalFeeds([
        makeSource('https://example.com/cal.ics', { enabled: false }),
      ])
      expect(disabled.status).toBe('failed')
    })
  })

  describe('date range filtering', () => {
    // Window: June 2024 (lower inclusive, upper exclusive)
    const LOWER = new Date('2024-06-01T00:00:00.000Z')
    const UPPER = new Date('2024-07-01T00:00:00.000Z')
    const JUNE = { lower: LOWER, upper: UPPER }

    /** VEVENT with explicit date lines; always carries a DTSTAMP so the
     *  DTSTAMP-vs-DTSTART prefix distinction is exercised. */
    function makeDatedEvent(uid: string, lines: string[]): string {
      return [
        'BEGIN:VEVENT',
        `UID:${uid}`,
        'DTSTAMP:20240101T000000Z',
        `SUMMARY:${uid}`,
        ...lines,
        'END:VEVENT',
      ].join('\r\n')
    }

    function uidsIn(ical: string): string[] {
      return [...ical.matchAll(/^UID:(.*)$/gm)].map(m => m[1] ?? '')
    }

    async function keptUids(
      events: string[],
      range: { lower?: Date; upper?: Date } | undefined = JUNE
    ): Promise<string[]> {
      vi.mocked(fetch).mockResolvedValue(makeOkResponse(makeCalendar(events)))
      const result = await combineICalFeeds(
        [makeSource('https://example.com/cal.ics')],
        15000,
        range
      )
      return uidsIn(result.icalContent)
    }

    it('is a no-op when no range is supplied', async () => {
      const events = [
        makeDatedEvent('old', ['DTSTART:20200101T090000Z']),
        makeDatedEvent('new', ['DTSTART:20300101T090000Z']),
      ]
      vi.mocked(fetch).mockResolvedValue(makeOkResponse(makeCalendar(events)))
      const unfiltered = await combineICalFeeds(
        [makeSource('https://example.com/cal.ics')],
        15000
      )
      expect(uidsIn(unfiltered.icalContent)).toEqual(['old', 'new'])
      expect(await keptUids(events, {})).toEqual(['old', 'new'])
    })

    it('keeps events inside the window and drops those before/after', async () => {
      const events = [
        makeDatedEvent('before', [
          'DTSTART:20240501T090000Z',
          'DTEND:20240501T100000Z',
        ]),
        makeDatedEvent('inside', [
          'DTSTART:20240615T090000Z',
          'DTEND:20240615T100000Z',
        ]),
        makeDatedEvent('after', [
          'DTSTART:20240715T090000Z',
          'DTEND:20240715T100000Z',
        ]),
      ]
      expect(await keptUids(events)).toEqual(['inside'])
    })

    it('keeps a multi-day event that straddles the lower bound', async () => {
      const events = [
        makeDatedEvent('straddle', [
          'DTSTART:20240530T090000Z',
          'DTEND:20240602T090000Z',
        ]),
      ]
      expect(await keptUids(events)).toEqual(['straddle'])
    })

    it('treats bounds as half-open: ends-at-lower dropped, starts-at-upper dropped, starts-at-lower kept', async () => {
      const events = [
        makeDatedEvent('ends-at-lower', [
          'DTSTART:20240531T230000Z',
          'DTEND:20240601T000000Z',
        ]),
        makeDatedEvent('starts-at-upper', [
          'DTSTART:20240701T000000Z',
          'DTEND:20240701T010000Z',
        ]),
        makeDatedEvent('starts-at-lower', ['DTSTART:20240601T000000Z']),
      ]
      expect(await keptUids(events)).toEqual(['starts-at-lower'])
    })

    it('gives all-day events a one-day default duration', async () => {
      const events = [
        makeDatedEvent('allday-before', ['DTSTART;VALUE=DATE:20240531']),
        makeDatedEvent('allday-inside', ['DTSTART;VALUE=DATE:20240610']),
        makeDatedEvent('allday-last', ['DTSTART;VALUE=DATE:20240630']),
        makeDatedEvent('allday-after', ['DTSTART;VALUE=DATE:20240701']),
      ]
      expect(await keptUids(events)).toEqual(['allday-inside', 'allday-last'])
    })

    it('honours DURATION when DTEND is absent', async () => {
      const events = [
        makeDatedEvent('dur-in', ['DTSTART:20240530T000000Z', 'DURATION:P3D']),
        makeDatedEvent('dur-out', [
          'DTSTART:20240530T000000Z',
          'DURATION:PT1H',
        ]),
      ]
      expect(await keptUids(events)).toEqual(['dur-in'])
    })

    it('treats TZID-qualified and floating times as UTC (approximation)', async () => {
      const events = [
        makeDatedEvent('tzid', [
          'DTSTART;TZID=Australia/Melbourne:20240615T090000',
          'DTEND;TZID=Australia/Melbourne:20240615T100000',
        ]),
        makeDatedEvent('floating', ['DTSTART:20240515T090000']),
      ]
      expect(await keptUids(events)).toEqual(['tzid'])
    })

    it('keeps events with missing or unparseable DTSTART (fail open)', async () => {
      const events = [
        makeDatedEvent('no-dtstart', []),
        makeDatedEvent('garbage', ['DTSTART:not-a-date']),
      ]
      expect(await keptUids(events)).toEqual(['no-dtstart', 'garbage'])
    })

    it('keeps an open-ended recurring series that started long ago', async () => {
      const events = [
        makeDatedEvent('weekly', [
          'DTSTART:20200106T090000Z',
          'DTEND:20200106T100000Z',
          'RRULE:FREQ=WEEKLY',
        ]),
      ]
      expect(await keptUids(events)).toEqual(['weekly'])
    })

    it('drops a recurring series whose UNTIL is before the window', async () => {
      const events = [
        makeDatedEvent('ended', [
          'DTSTART:20200106T090000Z',
          'RRULE:FREQ=WEEKLY;UNTIL=20240101T000000Z',
        ]),
        makeDatedEvent('still-running', [
          'DTSTART:20200106T090000Z',
          'RRULE:FREQ=WEEKLY;UNTIL=20240615T000000Z',
        ]),
        makeDatedEvent('allday-until-lower', [
          'DTSTART;VALUE=DATE:20200106',
          'RRULE:FREQ=WEEKLY;UNTIL=20240601',
        ]),
      ]
      expect(await keptUids(events)).toEqual([
        'still-running',
        'allday-until-lower',
      ])
    })

    it('drops a recurring series that starts after the window', async () => {
      const events = [
        makeDatedEvent('future-series', [
          'DTSTART:20240801T090000Z',
          'RRULE:FREQ=WEEKLY',
        ]),
      ]
      expect(await keptUids(events)).toEqual([])
    })

    it('keeps overrides of a kept series even when moved outside the window', async () => {
      const events = [
        makeDatedEvent('moved', [
          'RECURRENCE-ID:20240610T090000Z',
          'DTSTART:20240810T090000Z',
        ]),
        makeDatedEvent('series', [
          'DTSTART:20200106T090000Z',
          'RRULE:FREQ=WEEKLY',
        ]),
      ]
      // UID is the dedupe key, so both blocks must share it.
      const shared = events.map(e => e.replace(/^UID:.*$/m, 'UID:series'))
      vi.mocked(fetch).mockResolvedValue(makeOkResponse(makeCalendar(shared)))
      const result = await combineICalFeeds(
        [makeSource('https://example.com/cal.ics')],
        15000,
        JUNE
      )
      expect(result.eventsCount).toBe(2)
    })

    it('filters orphan overrides (no master in feed) on their own dates', async () => {
      const events = [
        makeDatedEvent('orphan-in', [
          'RECURRENCE-ID:20240110T090000Z',
          'DTSTART:20240610T090000Z',
        ]),
        makeDatedEvent('orphan-out', [
          'RECURRENCE-ID:20240110T090000Z',
          'DTSTART:20240110T090000Z',
        ]),
      ]
      expect(await keptUids(events)).toEqual(['orphan-in'])
    })

    it('supports one-sided ranges', async () => {
      const events = [
        makeDatedEvent('past', ['DTSTART:20240101T090000Z']),
        makeDatedEvent('future', ['DTSTART:20241201T090000Z']),
      ]
      expect(await keptUids(events, { lower: LOWER })).toEqual(['future'])
      expect(await keptUids(events, { upper: UPPER })).toEqual(['past'])
    })

    it('reports the filtered count in eventsCount', async () => {
      const events = [
        makeDatedEvent('a', ['DTSTART:20240615T090000Z']),
        makeDatedEvent('b', ['DTSTART:20240101T090000Z']),
        makeDatedEvent('c', ['DTSTART:20240620T090000Z']),
      ]
      vi.mocked(fetch).mockResolvedValue(makeOkResponse(makeCalendar(events)))
      const result = await combineICalFeeds(
        [makeSource('https://example.com/cal.ics')],
        15000,
        JUNE
      )
      expect(result.eventsCount).toBe(2)
      expect(result.status).toBe('ok')
    })
  })

  describe('result structure', () => {
    it('initialises counts to zero on empty-calendar failure', async () => {
      const result = await combineICalFeeds([])
      expect(result.eventsCount).toBe(0)
      expect(result.calendarsProcessed).toBe(0)
      expect(result.icalContent).toBe('')
      expect(result.status).toBe('failed')
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
