import LiveStatus from '../components/live-status'
import CreateCollectionForm from '../components/create-collection-form'
import { MergeDiagram } from '../components/merge-diagram'

/** The steps genuinely run in order, so they carry numbers. */
const STEPS = [
  {
    step: 'Paste your .ics links',
    detail:
      'Any public iCal feed works — Google Calendar, Outlook, iCloud, Fastmail.',
  },
  {
    step: 'Name the collection',
    detail: 'Add a custom ID to get a URL you can actually remember.',
  },
  {
    step: 'Subscribe once',
    detail:
      'Add the one URL to your calendar app. It re-fetches every source on refresh.',
  },
]

export default function HomePage() {
  return (
    <div className="mx-auto max-w-6xl px-5 sm:px-8">
      {/* Hero: the transformation, stated and then shown. */}
      <section className="grid gap-10 border-b border-rule py-14 md:py-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:items-center lg:gap-16">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-graphite">
            iCal feed aggregator
          </p>
          <h1 className="mt-5 font-display text-[2.75rem] font-extrabold leading-[0.95] tracking-tightest text-ink sm:text-6xl">
            Many calendars.
            <br />
            <span className="text-today">One URL.</span>
          </h1>
          <p className="mt-6 max-w-md text-[17px] leading-relaxed text-graphite">
            Point this at every .ics feed you care about. It fetches them all,
            merges the events, and serves the result at a single address your
            calendar app can subscribe to.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-xs text-graphite">
            <span>No account</span>
            <span aria-hidden="true" className="text-rule">
              /
            </span>
            <span>Deduplicates by UID</span>
            <span aria-hidden="true" className="text-rule">
              /
            </span>
            <span>Keeps timezones</span>
          </div>
        </div>

        <MergeDiagram />
      </section>

      {/* The form is the product. It gets the wide column. */}
      <section className="grid gap-12 py-14 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-7">
          <CreateCollectionForm />
        </div>

        <aside className="space-y-12 lg:col-span-5">
          <div>
            <h2 className="font-display text-sm font-bold uppercase tracking-[0.14em] text-ink">
              How it works
            </h2>
            <ol className="mt-5 space-y-5">
              {STEPS.map((item, i) => (
                <li key={item.step} className="flex gap-4">
                  <span
                    className="mt-0.5 font-mono text-xs font-semibold text-today"
                    aria-hidden="true"
                  >
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div className="border-l border-rule pl-4">
                    <h3 className="text-sm font-semibold text-ink">
                      {item.step}
                    </h3>
                    <p className="mt-1 text-sm leading-relaxed text-graphite">
                      {item.detail}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div id="status" className="scroll-mt-24">
            <h2 className="font-display text-sm font-bold uppercase tracking-[0.14em] text-ink">
              Service status
            </h2>
            <div className="mt-5">
              <LiveStatus />
            </div>
          </div>
        </aside>
      </section>
    </div>
  )
}
