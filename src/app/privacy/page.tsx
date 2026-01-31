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
    <div className="relative z-10 max-w-4xl mx-auto px-4 py-16 space-y-16">
      {/* Header */}
      <div className="text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-semibold text-emerald-400">
          <Shield className="w-3.5 h-3.5" />
          <span className="tracking-wider uppercase font-display font-bold">
            Privacy First
          </span>
        </div>

        <h1 className="text-4xl md:text-6xl font-display font-black tracking-tighter">
          <span className="bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
            Privacy & Security
          </span>
        </h1>

        <p className="text-lg text-slate-400 max-w-2xl mx-auto">
          We believe your calendar data is personal. Here&apos;s exactly how we
          handle it.
        </p>
      </div>

      {/* TL;DR Card */}
      <div className="backdrop-blur-2xl bg-emerald-500/5 border border-emerald-500/20 rounded-[2rem] p-8 space-y-4">
        <h2 className="text-xl font-display font-black text-emerald-400 flex items-center gap-3">
          <Eye className="w-5 h-5" />
          TL;DR
        </h2>
        <ul className="space-y-3 text-slate-300">
          <li className="flex items-start gap-3">
            <span className="text-emerald-400 mt-1">&#10003;</span>
            <span>
              <strong>No account required</strong> &ndash; we don&apos;t collect
              your email, name, or personal info
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-emerald-400 mt-1">&#10003;</span>
            <span>
              <strong>No event storage</strong> &ndash; calendar events are
              fetched on-demand and never stored
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-emerald-400 mt-1">&#10003;</span>
            <span>
              <strong>No cookies or tracking</strong> &ndash; no analytics, no
              advertising, no third-party scripts
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-emerald-400 mt-1">&#10003;</span>
            <span>
              <strong>Open source</strong> &ndash; fully auditable code on
              GitHub
            </span>
          </li>
        </ul>
      </div>

      {/* Detailed Sections */}
      <div className="space-y-12">
        {/* What We Store */}
        <section className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Database className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-display font-black text-white">
              What We Store
            </h2>
          </div>

          <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
            <p className="text-slate-300 leading-relaxed">
              When you create a calendar collection, we store only:
            </p>
            <ul className="space-y-2 text-slate-400 ml-4">
              <li className="flex items-start gap-2">
                <span className="text-purple-400">&bull;</span>
                <span>
                  <strong className="text-slate-300">
                    Collection metadata
                  </strong>
                  : Name, description, and creation timestamp
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-400">&bull;</span>
                <span>
                  <strong className="text-slate-300">
                    Calendar source URLs
                  </strong>
                  : The iCal feed URLs you provide
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-400">&bull;</span>
                <span>
                  <strong className="text-slate-300">
                    Display preferences
                  </strong>
                  : Calendar names and colors you assign
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-400">&bull;</span>
                <span>
                  <strong className="text-slate-300">Collection GUID</strong>: A
                  unique identifier (auto-generated or custom)
                </span>
              </li>
            </ul>
            <div className="mt-4 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-200 text-sm">
              <strong>Note:</strong> Calendar URLs are stored in plaintext. If
              your calendar URLs contain authentication tokens (common with
              Google Calendar), those tokens are stored as part of the URL.
            </div>
          </div>
        </section>

        {/* What We Don't Store */}
        <section className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20">
              <Trash2 className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-display font-black text-white">
              What We Don&apos;t Store
            </h2>
          </div>

          <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
            <ul className="space-y-2 text-slate-400">
              <li className="flex items-start gap-2">
                <span className="text-red-400">&times;</span>
                <span>
                  <strong className="text-slate-300">
                    Your calendar events
                  </strong>{' '}
                  &ndash; events are fetched in real-time and immediately
                  returned to your client
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-400">&times;</span>
                <span>
                  <strong className="text-slate-300">
                    Personal information
                  </strong>
                  &ndash; no accounts, no emails, no names required
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-400">&times;</span>
                <span>
                  <strong className="text-slate-300">Usage analytics</strong>{' '}
                  &ndash; no tracking pixels, no Google Analytics, no
                  third-party scripts
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-400">&times;</span>
                <span>
                  <strong className="text-slate-300">Cookies</strong> &ndash; we
                  don&apos;t set any cookies
                </span>
              </li>
            </ul>
          </div>
        </section>

        {/* How Data Flows */}
        <section className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Globe className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-display font-black text-white">
              How Data Flows
            </h2>
          </div>

          <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-slate-200">
                When you subscribe to a combined calendar:
              </h3>
              <ol className="space-y-3 text-slate-400 ml-4">
                <li className="flex items-start gap-3">
                  <span className="text-blue-400 font-mono text-sm bg-blue-500/10 px-2 py-0.5 rounded">
                    1
                  </span>
                  <span>
                    Your calendar app requests our aggregated feed URL
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-blue-400 font-mono text-sm bg-blue-500/10 px-2 py-0.5 rounded">
                    2
                  </span>
                  <span>
                    We fetch events from each source calendar in parallel
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-blue-400 font-mono text-sm bg-blue-500/10 px-2 py-0.5 rounded">
                    3
                  </span>
                  <span>Events are merged, deduplicated, and returned</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-blue-400 font-mono text-sm bg-blue-500/10 px-2 py-0.5 rounded">
                    4
                  </span>
                  <span>
                    Event data is immediately discarded &ndash; nothing is
                    cached
                  </span>
                </li>
              </ol>
            </div>

            <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-200 text-sm">
              <strong>External Connections:</strong> We connect to the calendar
              servers you specify (Google, Outlook, iCloud, etc.) to fetch your
              events. These connections use HTTPS encryption.
            </div>
          </div>
        </section>

        {/* Security Measures */}
        <section className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Lock className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-display font-black text-white">
              Security Measures
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                title: 'HTTPS Everywhere',
                desc: 'All connections encrypted with TLS. HTTP requests automatically upgraded.',
              },
              {
                title: 'Secure Headers',
                desc: 'HSTS, CSP, X-Frame-Options, and other security headers enforced.',
              },
              {
                title: 'Cryptographic GUIDs',
                desc: 'Collection IDs generated using cryptographically secure random functions.',
              },
              {
                title: 'Input Validation',
                desc: 'All inputs sanitized and validated before processing.',
              },
            ].map((item, i) => (
              <div
                key={i}
                className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-xl p-5 space-y-2"
              >
                <h3 className="font-bold text-slate-200">{item.title}</h3>
                <p className="text-sm text-slate-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Server Logging */}
        <section className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Server className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-display font-black text-white">
              Server Logging
            </h2>
          </div>

          <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
            <p className="text-slate-300 leading-relaxed">
              For debugging and operational purposes, our servers may log:
            </p>
            <ul className="space-y-2 text-slate-400 ml-4">
              <li className="flex items-start gap-2">
                <span className="text-amber-400">&bull;</span>
                <span>Collection GUID and name when accessed</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-400">&bull;</span>
                <span>Number of calendars in a collection</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-400">&bull;</span>
                <span>Success/failure status of calendar fetches</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-400">&bull;</span>
                <span>Error messages (not calendar content)</span>
              </li>
            </ul>
            <p className="text-slate-400 text-sm mt-4">
              Logs are ephemeral and not persisted long-term. We do not log IP
              addresses, calendar event content, or detailed URL paths.
            </p>
          </div>
        </section>

        {/* GUID Access Model */}
        <section className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <FileText className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-display font-black text-white">
              Access Control
            </h2>
          </div>

          <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
            <p className="text-slate-300 leading-relaxed">
              Collections use a <strong>GUID-based access model</strong>:
            </p>
            <ul className="space-y-2 text-slate-400 ml-4">
              <li className="flex items-start gap-2">
                <span className="text-indigo-400">&bull;</span>
                <span>
                  Anyone with your collection&apos;s GUID can access it
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-indigo-400">&bull;</span>
                <span>
                  Auto-generated GUIDs are cryptographically random (effectively
                  unguessable)
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-indigo-400">&bull;</span>
                <span>
                  Custom IDs you choose may be easier to guess &ndash; use them
                  wisely
                </span>
              </li>
            </ul>
            <div className="mt-4 p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-200 text-sm">
              <strong>Tip:</strong> Treat your collection URL like a private
              link. If you want to revoke access, delete the collection and
              create a new one.
            </div>
          </div>
        </section>

        {/* Open Source */}
        <section className="space-y-6">
          <div className="backdrop-blur-2xl bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-white/10 rounded-[2rem] p-8 space-y-4">
            <h2 className="text-2xl font-display font-black text-white flex items-center gap-3">
              <Shield className="w-6 h-6 text-purple-400" />
              Fully Open Source
            </h2>
            <p className="text-slate-300 leading-relaxed">
              Don&apos;t take our word for it &ndash; audit the code yourself.
              This entire application is open source and available on GitHub.
            </p>
            <a
              href="https://github.com/seansoreilly/calendar-aggregator"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-white font-semibold transition-all"
            >
              View Source Code
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </section>

        {/* Contact */}
        <section className="text-center space-y-4 pt-8">
          <p className="text-slate-400">
            Questions about our privacy practices?
          </p>
          <p className="text-slate-300">
            Open an issue on{' '}
            <a
              href="https://github.com/seansoreilly/calendar-aggregator/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-400 hover:text-purple-300 underline underline-offset-2"
            >
              GitHub
            </a>{' '}
            or reach out via the repository.
          </p>
        </section>
      </div>

      {/* Back to Home */}
      <div className="text-center pt-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white font-semibold transition-all"
        >
          &larr; Back to Home
        </Link>
      </div>
    </div>
  )
}
