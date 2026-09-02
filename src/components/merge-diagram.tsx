/**
 * The hero. Three source feeds, shown as the .ics text they actually are,
 * converging into the single feed this service hands back. The lines are
 * real iCal properties, not sample prose — the product's own material is
 * the illustration.
 */

interface SourceFeed {
  label: string
  color: string
  lines: string[]
}

const SOURCES: SourceFeed[] = [
  {
    label: 'work.ics',
    color: 'var(--stamp)',
    lines: ['SUMMARY:Standup', 'DTSTART:0930', 'SUMMARY:Design review'],
  },
  {
    label: 'family.ics',
    color: '#3F7D58',
    lines: ['SUMMARY:School pickup', 'DTSTART:1515'],
  },
  {
    label: 'club.ics',
    color: 'var(--today)',
    lines: ['SUMMARY:Match day', 'DTSTART:1100'],
  },
]

const MERGED = [
  { text: 'BEGIN:VCALENDAR', muted: true },
  { text: 'X-WR-CALNAME:Everything', muted: true },
  { text: 'SUMMARY:Standup', color: 'var(--stamp)' },
  { text: 'SUMMARY:Match day', color: 'var(--today)' },
  { text: 'SUMMARY:Design review', color: 'var(--stamp)' },
  { text: 'SUMMARY:School pickup', color: '#3F7D58' },
  { text: 'END:VCALENDAR', muted: true },
]

export function MergeDiagram() {
  return (
    <div
      className="grid gap-6 sm:gap-8 md:grid-cols-[1fr_auto_1fr] md:items-stretch"
      aria-hidden="true"
    >
      {/* Source feeds */}
      <div className="space-y-3">
        {SOURCES.map((source, i) => (
          <div
            key={source.label}
            className="animate-converge border border-rule bg-sheet px-3 py-2.5"
            style={
              {
                animationDelay: `${i * 90}ms`,
                '--from-x': '-16px',
              } as React.CSSProperties
            }
          >
            <div className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 shrink-0"
                style={{ backgroundColor: source.color }}
              />
              <span className="font-mono text-[11px] font-medium text-ink">
                {source.label}
              </span>
            </div>
            <div className="mt-1.5 space-y-0.5 pl-[18px]">
              {source.lines.map(line => (
                <div
                  key={line}
                  className="truncate font-mono text-[10px] leading-relaxed text-graphite"
                >
                  {line}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Junction: a single connecting rule with the operation named on it. */}
      <div className="relative flex items-center justify-center py-2 md:py-0">
        <div
          className="animate-rule-draw absolute h-px w-full bg-rule md:h-full md:w-px"
          style={{ animationDelay: '260ms' }}
        />
        <div
          className="animate-converge relative border border-ink bg-paper px-2 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-ink"
          style={{ animationDelay: '300ms' }}
        >
          merge
        </div>
      </div>

      {/* Merged output */}
      <div
        className="animate-converge self-center border-2 border-ink bg-sheet"
        style={
          { animationDelay: '380ms', '--from-x': '16px' } as React.CSSProperties
        }
      >
        <div className="border-b border-rule px-3 py-2">
          <span className="font-mono text-[11px] font-semibold text-ink">
            one feed
          </span>
        </div>
        <div className="space-y-0.5 px-3 py-2.5">
          {MERGED.map((line, i) => (
            <div
              key={line.text}
              className="animate-converge truncate font-mono text-[10px] leading-relaxed"
              style={
                {
                  animationDelay: `${460 + i * 55}ms`,
                  '--from-x': '-10px',
                  color: line.muted ? 'var(--graphite)' : line.color,
                } as React.CSSProperties
              }
            >
              {line.text}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
