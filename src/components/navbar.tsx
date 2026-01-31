import Link from 'next/link'
import Image from 'next/image'
import { Github } from 'lucide-react'

export function Navbar() {
  return (
    <nav className="sticky top-0 z-50 w-full border-b border-white/10 bg-black/20 backdrop-blur-xl">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative w-9 h-9 rounded-xl overflow-hidden group-hover:shadow-lg group-hover:shadow-purple-500/20 transition-all duration-300 ring-1 ring-white/10">
            <Image
              src="/logo.png"
              alt="Calendar Aggregator Logo"
              fill
              className="object-cover"
            />
          </div>
          <span className="font-display font-bold text-lg bg-gradient-to-r from-white to-gray-200 bg-clip-text text-transparent">
            Calendar Aggregator
          </span>
        </Link>

        <div className="flex items-center gap-6">
          <Link
            href="/api/health"
            className="text-sm font-medium text-gray-300 hover:text-white transition-colors"
          >
            Health Status
          </Link>
          <a
            href="https://github.com/seansoreilly/calendar-aggregator"
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded-full hover:bg-white/10 transition-colors text-gray-300 hover:text-white"
          >
            <Github className="w-5 h-5" />
          </a>
        </div>
      </div>
    </nav>
  )
}
