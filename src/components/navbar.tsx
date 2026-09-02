import Link from 'next/link'
import Image from 'next/image'
import { Github } from 'lucide-react'

export function Navbar() {
  return (
    <nav className="sticky top-0 z-50 w-full border-b border-rule bg-paper/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <Image
            src="/logo.png"
            alt=""
            width={28}
            height={28}
            className="border border-rule object-cover"
          />
          <span className="font-display text-[15px] font-extrabold tracking-tightest text-ink">
            Calendar<span className="hidden sm:inline"> Aggregator</span>
          </span>
        </Link>

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
    </nav>
  )
}
