import {
  Shield,
  Database,
  Globe,
  Eye,
  Lock,
  Server,
  Trash2,
  FileText,
  ExternalLink,
} from 'lucide-react'
import Link from 'next/link'

export const metadata = {
  title: 'Privacy & Security Policy | Calendar Aggregator',
  description:
    'Learn how Calendar Aggregator handles your data with privacy-first architecture.',
}

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-14 px-5 py-16 sm:px-8">
      {/* Header */}
      <div className="space-y-4">
        <p className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.18em] text-graphite">
          <Shield className="h-3.5 w-3.5" aria-hidden="true" />
          Privacy first
        </p>
        <h1 className="font-display text-4xl font-extrabold tracking-tightest text-ink sm:text-5xl">
          Privacy &amp; security
        </h1>
        <p className="max-w-xl text-[17px] leading-relaxed text-graphite">
          We believe your calendar data is personal. Here&apos;s exactly how we
          handle it.
        </p>
      </div>

      {/* TL;DR Card */}
      <div className="border-2 border-ink bg-sheet p-6">
        <h2 className="flex items-center gap-2 font-display text-sm font-bold uppercase tracking-[0.14em] text-ink">
          <Eye className="h-4 w-4" aria-hidden="true" />
          TL;DR
        </h2>
        <ul className="mt-4 space-y-3 text-sm leading-relaxed text-graphite">
          <li className="flex items-start gap-3">
            <span className="mt-0.5 text-ink" aria-hidden="true">
              &#10003;
            </span>
            <span>
              <strong className="text-ink">No account required</strong> &ndash;
              we don&apos;t collect your email, name, or personal info
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="mt-0.5 text-ink" aria-hidden="true">
              &#10003;
            </span>
            <span>
              <strong className="text-ink">No event storage</strong> &ndash;
              calendar events are fetched on-demand and never stored
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="mt-0.5 text-ink" aria-hidden="true">
              &#10003;
            </span>
            <span>
              <strong className="text-ink">No cookies or tracking</strong>{' '}
              &ndash; no analytics, no advertising, no third-party scripts
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="mt-0.5 text-ink" aria-hidden="true">
              &#10003;
            </span>
            <span>
              <strong className="text-ink">Open source</strong> &ndash; fully
              auditable code on GitHub
            </span>
          </li>
        </ul>
      </div>

      {/* Detailed Sections */}
      <div className="space-y-12">
        {/* What We Store */}
        <section className="space-y-4">
          <div className="flex items-center gap-3 border-b border-ink pb-2">
            <Database className="h-4 w-4 text-ink" aria-hidden="true" />
            <h2 className="font-display text-sm font-bold uppercase tracking-[0.14em] text-ink">
              What we store
            </h2>
          </div>

          <div className="space-y-4">
            <p className="text-sm leading-relaxed text-graphite">
              When you create a calendar collection, we store only:
            </p>
            <ul className="ml-4 space-y-2 text-sm leading-relaxed text-graphite">
              <li className="flex items-start gap-2">
                <span className="text-ink" aria-hidden="true">
                  &bull;
                </span>
                <span>
                  <strong className="text-ink">Collection metadata</strong>:
                  Name, description, and creation timestamp
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-ink" aria-hidden="true">
                  &bull;
                </span>
                <span>
                  <strong className="text-ink">Calendar source URLs</strong>:
                  The iCal feed URLs you provide
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-ink" aria-hidden="true">
                  &bull;
                </span>
                <span>
                  <strong className="text-ink">Display preferences</strong>:
                  Calendar names and colors you assign
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-ink" aria-hidden="true">
                  &bull;
                </span>
                <span>
                  <strong className="text-ink">Collection GUID</strong>: A
                  unique identifier (auto-generated or custom)
                </span>
              </li>
            </ul>
            <div className="border-l-2 border-today py-1 pl-4 text-sm leading-relaxed text-ink">
              <strong>Note:</strong> Calendar URLs are stored in plaintext. If
              your calendar URLs contain authentication tokens (common with
              Google Calendar), those tokens are stored as part of the URL.
            </div>
          </div>
        </section>

        {/* What We Don't Store */}
        <section className="space-y-4">
          <div className="flex items-center gap-3 border-b border-ink pb-2">
            <Trash2 className="h-4 w-4 text-ink" aria-hidden="true" />
            <h2 className="font-display text-sm font-bold uppercase tracking-[0.14em] text-ink">
              What we don&apos;t store
            </h2>
          </div>

          <ul className="space-y-2 text-sm leading-relaxed text-graphite">
            <li className="flex items-start gap-2">
              <span className="text-ink" aria-hidden="true">
                &times;
              </span>
              <span>
                <strong className="text-ink">Your calendar events</strong>{' '}
                &ndash; events are fetched in real-time and immediately returned
                to your client
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-ink" aria-hidden="true">
                &times;
              </span>
              <span>
                <strong className="text-ink">Personal information</strong>
                &ndash; no accounts, no emails, no names required
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-ink" aria-hidden="true">
                &times;
              </span>
              <span>
                <strong className="text-ink">Usage analytics</strong> &ndash; no
                tracking pixels, no Google Analytics, no third-party scripts
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-ink" aria-hidden="true">
                &times;
              </span>
              <span>
                <strong className="text-ink">Cookies</strong> &ndash; we
                don&apos;t set any cookies
              </span>
            </li>
          </ul>
        </section>

        {/* How Data Flows */}
        <section className="space-y-4">
          <div className="flex items-center gap-3 border-b border-ink pb-2">
            <Globe className="h-4 w-4 text-ink" aria-hidden="true" />
            <h2 className="font-display text-sm font-bold uppercase tracking-[0.14em] text-ink">
              How data flows
            </h2>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-ink">
              When you subscribe to a combined calendar:
            </h3>
            <ol className="ml-4 space-y-3 text-sm leading-relaxed text-graphite">
              <li className="flex items-start gap-3">
                <span
                  className="mt-0.5 font-mono text-xs font-semibold text-today"
                  aria-hidden="true"
                >
                  01
                </span>
                <span>Your calendar app requests our aggregated feed URL</span>
              </li>
              <li className="flex items-start gap-3">
                <span
                  className="mt-0.5 font-mono text-xs font-semibold text-today"
                  aria-hidden="true"
                >
                  02
                </span>
                <span>
                  We fetch events from each source calendar in parallel
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span
                  className="mt-0.5 font-mono text-xs font-semibold text-today"
                  aria-hidden="true"
                >
                  03
                </span>
                <span>Events are merged, deduplicated, and returned</span>
              </li>
              <li className="flex items-start gap-3">
                <span
                  className="mt-0.5 font-mono text-xs font-semibold text-today"
                  aria-hidden="true"
                >
                  04
                </span>
                <span>
                  Event data is immediately discarded &ndash; nothing is cached
                </span>
              </li>
            </ol>

            <div className="border-l-2 border-rule py-1 pl-4 text-sm leading-relaxed text-graphite">
              <strong className="text-ink">External connections:</strong> We
              connect to the calendar servers you specify (Google, Outlook,
              iCloud, etc.) to fetch your events. These connections use HTTPS
              encryption.
            </div>
          </div>
        </section>

        {/* Security Measures */}
        <section className="space-y-4">
          <div className="flex items-center gap-3 border-b border-ink pb-2">
            <Lock className="h-4 w-4 text-ink" aria-hidden="true" />
            <h2 className="font-display text-sm font-bold uppercase tracking-[0.14em] text-ink">
              Security measures
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[
              {
                title: 'HTTPS everywhere',
                desc: 'All connections encrypted with TLS. HTTP requests automatically upgraded.',
              },
              {
                title: 'Secure headers',
                desc: 'HSTS, CSP, X-Frame-Options, and other security headers enforced.',
              },
              {
                title: 'Cryptographic GUIDs',
                desc: 'Collection IDs generated using cryptographically secure random functions.',
              },
              {
                title: 'Input validation',
                desc: 'All inputs sanitized and validated before processing.',
              },
            ].map(item => (
              <div key={item.title} className="border border-rule p-4">
                <h3 className="text-sm font-semibold text-ink">{item.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-graphite">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Server Logging */}
        <section className="space-y-4">
          <div className="flex items-center gap-3 border-b border-ink pb-2">
            <Server className="h-4 w-4 text-ink" aria-hidden="true" />
            <h2 className="font-display text-sm font-bold uppercase tracking-[0.14em] text-ink">
              Server logging
            </h2>
          </div>

          <div className="space-y-4">
            <p className="text-sm leading-relaxed text-graphite">
              For debugging and operational purposes, our servers may log:
            </p>
            <ul className="ml-4 space-y-2 text-sm leading-relaxed text-graphite">
              <li className="flex items-start gap-2">
                <span className="text-ink" aria-hidden="true">
                  &bull;
                </span>
                <span>Collection GUID and name when accessed</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-ink" aria-hidden="true">
                  &bull;
                </span>
                <span>Number of calendars in a collection</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-ink" aria-hidden="true">
                  &bull;
                </span>
                <span>Success/failure status of calendar fetches</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-ink" aria-hidden="true">
                  &bull;
                </span>
                <span>Error messages (not calendar content)</span>
              </li>
            </ul>
            <p className="text-sm leading-relaxed text-graphite">
              Logs are ephemeral and not persisted long-term. We do not log IP
              addresses, calendar event content, or detailed URL paths.
            </p>
          </div>
        </section>

        {/* GUID Access Model */}
        <section className="space-y-4">
          <div className="flex items-center gap-3 border-b border-ink pb-2">
            <FileText className="h-4 w-4 text-ink" aria-hidden="true" />
            <h2 className="font-display text-sm font-bold uppercase tracking-[0.14em] text-ink">
              Access control
            </h2>
          </div>

          <div className="space-y-4">
            <p className="text-sm leading-relaxed text-graphite">
              Collections use a{' '}
              <strong className="text-ink">GUID-based access model</strong>:
            </p>
            <ul className="ml-4 space-y-2 text-sm leading-relaxed text-graphite">
              <li className="flex items-start gap-2">
                <span className="text-ink" aria-hidden="true">
                  &bull;
                </span>
                <span>
                  Anyone with your collection&apos;s GUID can access it
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-ink" aria-hidden="true">
                  &bull;
                </span>
                <span>
                  Auto-generated GUIDs are cryptographically random (effectively
                  unguessable)
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-ink" aria-hidden="true">
                  &bull;
                </span>
                <span>
                  Custom IDs you choose may be easier to guess &ndash; use them
                  wisely
                </span>
              </li>
            </ul>
            <div className="border-l-2 border-rule py-1 pl-4 text-sm leading-relaxed text-graphite">
              <strong className="text-ink">Tip:</strong> Treat your collection
              URL like a private link. If you want to revoke access, delete the
              collection and create a new one.
            </div>
          </div>
        </section>

        {/* Open Source */}
        <section>
          <div className="border-2 border-ink bg-sheet p-6 space-y-4">
            <h2 className="flex items-center gap-2 font-display text-sm font-bold uppercase tracking-[0.14em] text-ink">
              <Shield className="h-4 w-4" aria-hidden="true" />
              Fully open source
            </h2>
            <p className="text-sm leading-relaxed text-graphite">
              Don&apos;t take our word for it &ndash; audit the code yourself.
              This entire application is open source and available on GitHub.
            </p>
            <a
              href="https://github.com/seansoreilly/calendar-aggregator"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 border border-ink px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-ink hover:text-paper"
            >
              View source code
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
            </a>
          </div>
        </section>

        {/* Contact */}
        <section className="space-y-2 pt-4 text-center">
          <p className="text-sm text-graphite">
            Questions about our privacy practices?
          </p>
          <p className="text-sm text-graphite">
            Open an issue on{' '}
            <a
              href="https://github.com/seansoreilly/calendar-aggregator/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="text-ink underline underline-offset-2 hover:text-today"
            >
              GitHub
            </a>{' '}
            or reach out via the repository.
          </p>
        </section>
      </div>

      {/* Back to Home */}
      <div className="pt-4 text-center">
        <Link
          href="/"
          className="text-sm font-semibold text-graphite transition-colors hover:text-ink"
        >
          &larr; Back to home
        </Link>
      </div>
    </div>
  )
}
