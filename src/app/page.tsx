import { Package, Terminal, Code2, Calendar, Sparkles } from 'lucide-react'
import LiveStatus from '@/components/live-status'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Animated background blobs */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-blue-400 to-cyan-400 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-gradient-to-br from-indigo-400 to-purple-400 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-12 space-y-8">
        {/* Hero section */}
        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 shadow-2xl hover:bg-white/15 transition-all duration-300 hover:scale-[1.02] hover:shadow-purple-500/20">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-purple-400 to-pink-400 shadow-lg">
              <Calendar className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent tracking-tight">
                Calendar Aggregator
              </h1>
              <p className="text-xl text-purple-200 font-medium">
                GUID-based Calendar Collections
              </p>
            </div>
          </div>
          <p className="text-lg text-gray-300 leading-relaxed">
            Seamlessly combine multiple calendar feeds into unified iCal
            subscriptions. Perfect for teams, organizations, and personal
            productivity.
          </p>
        </div>

        {/* API Endpoints Card */}
        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 shadow-2xl hover:bg-white/15 transition-all duration-300 hover:scale-[1.02] hover:shadow-blue-500/20">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-400 to-cyan-400 shadow-lg">
              <Package className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
              API Endpoints
            </h2>
          </div>
          <div className="space-y-4 mb-8">
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-white/10">
              <Sparkles className="w-5 h-5 text-purple-300" />
              <code className="font-mono text-sm bg-black/30 px-3 py-1 rounded-lg text-cyan-300 font-medium">
                /api/collections
              </code>
              <span className="text-gray-300 ml-auto">
                Create calendar collections
              </span>
            </div>
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border border-white/10">
              <Sparkles className="w-5 h-5 text-blue-300" />
              <code className="font-mono text-sm bg-black/30 px-3 py-1 rounded-lg text-cyan-300 font-medium">
                /api/calendar/[guid]
              </code>
              <span className="text-gray-300 ml-auto">
                Get aggregated iCal feed
              </span>
            </div>
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-white/10">
              <Sparkles className="w-5 h-5 text-green-300" />
              <code className="font-mono text-sm bg-black/30 px-3 py-1 rounded-lg text-cyan-300 font-medium">
                /api/health
              </code>
              <span className="text-gray-300 ml-auto">System health check</span>
            </div>
          </div>
          <a
            href="/api/health"
            target="_blank"
            className="inline-flex items-center px-6 py-3 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium shadow-lg hover:from-purple-600 hover:to-pink-600 transition-all duration-300 hover:scale-105 hover:shadow-purple-500/50"
          >
            Test API
          </a>
        </div>

        {/* Live Status Card */}
        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 shadow-2xl hover:bg-white/15 transition-all duration-300 hover:scale-[1.02] hover:shadow-green-500/20">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-green-400 to-emerald-400 shadow-lg">
              <Terminal className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
              Live Status
            </h2>
          </div>
          <LiveStatus />
          <div className="mt-8">
            <a
              href="/api/health"
              target="_blank"
              className="inline-flex items-center px-6 py-3 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-500 text-white font-medium shadow-lg hover:from-green-600 hover:to-emerald-600 transition-all duration-300 hover:scale-105 hover:shadow-green-500/50"
            >
              View Health API
            </a>
          </div>
        </div>

        {/* Quick Start Card */}
        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 shadow-2xl hover:bg-white/15 transition-all duration-300 hover:scale-[1.02] hover:shadow-indigo-500/20">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-indigo-400 to-blue-400 shadow-lg">
              <Code2 className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
              Quick Start
            </h2>
          </div>
          <p className="text-lg text-gray-300 leading-relaxed mb-6">
            Get started with the Calendar Aggregator API in 4 simple steps:
          </p>
          <div className="space-y-4 mb-8">
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border border-white/10">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-r from-indigo-400 to-purple-400 text-white font-bold text-sm">
                1
              </span>
              <span className="text-white">POST to</span>
              <code className="font-mono text-sm bg-black/30 px-3 py-1 rounded-lg text-cyan-300 font-medium">
                /api/collections
              </code>
            </div>
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-white/10">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-r from-purple-400 to-pink-400 text-white font-bold text-sm">
                2
              </span>
              <span className="text-white">Get your GUID from response</span>
            </div>
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-pink-500/20 to-orange-500/20 border border-white/10">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-r from-pink-400 to-orange-400 text-white font-bold text-sm">
                3
              </span>
              <span className="text-white">
                In your calendar app (Google Calendar, Outlook, etc.), subscribe
                to
              </span>
              <code className="font-mono text-sm bg-black/30 px-3 py-1 rounded-lg text-cyan-300 font-medium">
                /api/calendar/[guid]
              </code>
            </div>
          </div>
          <a
            href="https://github.com/seansoreilly/calendar-aggregator"
            target="_blank"
            className="inline-flex items-center px-6 py-3 rounded-2xl bg-gradient-to-r from-indigo-500/30 to-purple-500/30 text-white font-medium border border-white/20 hover:bg-gradient-to-r hover:from-indigo-500/50 hover:to-purple-500/50 transition-all duration-300 hover:scale-105"
          >
            Documentation
          </a>
        </div>

        {/* Footer */}
        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 shadow-2xl hover:bg-white/15 transition-all duration-300">
          <div className="text-center space-y-4">
            <p className="text-lg text-gray-300">
              Created by{' '}
              <a
                href="https://balddata.xyz"
                target="_blank"
                className="text-transparent bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text hover:from-purple-300 hover:to-pink-300 transition-all duration-300 font-medium"
              >
                balddata.xyz
              </a>{' '}
              •{' '}
              <a
                href="mailto:sean@balddata.xyz"
                className="text-transparent bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text hover:from-blue-300 hover:to-cyan-300 transition-all duration-300 font-medium"
              >
                sean@balddata.xyz
              </a>
            </p>
            <p className="text-sm text-gray-400">
              Built with Next.js 15, TypeScript, and modern serverless
              architecture
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
