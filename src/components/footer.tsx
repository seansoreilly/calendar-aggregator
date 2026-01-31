import { Github, Twitter, Heart } from 'lucide-react'
import Link from 'next/link'

export function Footer() {
  return (
    <footer className="w-full border-t border-white/10 bg-black/20 backdrop-blur-xl mt-auto">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* Brand */}
          <div className="space-y-4">
            <h3 className="text-lg font-display font-bold bg-gradient-to-r from-white to-gray-200 bg-clip-text text-transparent">
              Calendar Aggregator
            </h3>
            <p className="text-sm text-gray-400 leading-relaxed max-w-xs">
              Simplify your schedule by combining multiple calendar feeds into
              one unified subscription. Open source and privacy-focused.
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider">
              Resources
            </h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>
                <Link
                  href="/api/health"
                  className="hover:text-purple-400 transition-colors"
                >
                  System Status
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  className="hover:text-purple-400 transition-colors"
                >
                  Documentation
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  className="hover:text-purple-400 transition-colors"
                >
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>

          {/* Social / Credits */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider">
              Connect
            </h4>
            <div className="flex gap-4">
              <a
                href="https://github.com/seansoreilly/calendar-aggregator"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all"
              >
                <Github className="w-5 h-5" />
              </a>
              <a
                href="#"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all"
              >
                <Twitter className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>

        <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-gray-500">
          <p>
            © {new Date().getFullYear()} Calendar Aggregator. All rights
            reserved.
          </p>
          <div className="flex items-center gap-1">
            <span>Made with</span>
            <Heart className="w-3 h-3 text-red-500 fill-red-500" />
            <span>
              by{' '}
              <a
                href="https://balddata.xyz"
                className="text-purple-400 hover:text-purple-300 underline underline-offset-2"
              >
                balddata.xyz
              </a>
            </span>
          </div>
        </div>
      </div>
    </footer>
  )
}
