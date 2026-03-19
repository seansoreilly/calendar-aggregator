import { Calendar, MousePointer2, Layers, CheckCircle2 } from 'lucide-react'
import LiveStatus from '../components/live-status'
import CreateCollectionForm from '../components/create-collection-form'

export default function HomePage() {
  return (
    <div className="relative z-10 max-w-5xl mx-auto px-4 py-12 space-y-16">
      {/* Hero */}
      <div className="text-center space-y-4 pt-8">
        <div className="inline-flex items-center gap-2 p-2 rounded-xl bg-white/5 border border-white/10 mb-2">
          <Calendar className="w-5 h-5 text-purple-400" />
        </div>
        <h1 className="text-5xl md:text-6xl font-black tracking-tight text-white">
          Calendar Aggregator
        </h1>
        <p className="text-lg text-slate-400 max-w-xl mx-auto">
          Combine multiple iCal feeds into one URL. Subscribe once, see
          everything.
        </p>
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* Form */}
        <div className="lg:col-span-7">
          <CreateCollectionForm />
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-5 space-y-8 sticky top-24">
          {/* How it works */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-white">How it works</h2>
            <div className="space-y-3">
              {[
                {
                  icon: <MousePointer2 className="w-4 h-4" />,
                  step: 'Paste your iCal URLs',
                  detail:
                    'Works with Google Calendar, Outlook, iCloud, and any public .ics feed.',
                },
                {
                  icon: <Layers className="w-4 h-4" />,
                  step: 'Name your collection',
                  detail: 'Optionally set a custom ID to get a memorable URL.',
                },
                {
                  icon: <CheckCircle2 className="w-4 h-4" />,
                  step: 'Subscribe in your calendar app',
                  detail:
                    'Add the generated URL to any calendar app. Events update in real time.',
                },
              ].map((item, i) => (
                <div
                  key={i}
                  className="flex items-start gap-4 p-4 rounded-2xl bg-white/5 border border-white/5"
                >
                  <div className="mt-0.5 p-2 rounded-lg bg-slate-800 text-slate-400 shrink-0">
                    {item.icon}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">
                      {item.step}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                      {item.detail}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Status */}
          <div className="backdrop-blur-2xl bg-white/5 border border-white/10 rounded-2xl p-6">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">
              System Status
            </h2>
            <LiveStatus />
          </div>
        </div>
      </div>
    </div>
  )
}
