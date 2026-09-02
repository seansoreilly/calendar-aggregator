import { Github } from 'lucide-react'
import Link from 'next/link'

export function Footer() {
  return (
    <footer className="mt-auto border-t border-rule bg-paper">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <p className="font-mono text-xs text-graphite">
          © {new Date().getFullYear()} Calendar Aggregator · built by{' '}
          <a
            href="https://balddata.xyz"
            className="text-ink underline underline-offset-2 hover:text-today"
          >
            balddata.xyz
          </a>
        </p>

        <div className="flex items-center gap-6">
          <Link
            href="/privacy"
            className="text-sm text-graphite transition-colors hover:text-ink"
          >
            Privacy
          </Link>
          <Link
            href="/#status"
            className="text-sm text-graphite transition-colors hover:text-ink"
          >
            Status
          </Link>
          <a
            href="https://github.com/seansoreilly/calendar-aggregator"
            target="_blank"
            rel="noopener noreferrer"
            className="text-graphite transition-colors hover:text-ink"
            aria-label="View the source on GitHub"
          >
            <Github className="h-[18px] w-[18px]" />
          </a>
        </div>
      </div>
    </footer>
  )
}
