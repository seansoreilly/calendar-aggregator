import {
  Terminal,
  Sparkles,
  Zap,
  Shield,
  Globe,
  Calendar,
  Layers,
  Cpu,
  Lock,
  MousePointer2,
  CheckCircle2,
} from 'lucide-react'
import LiveStatus from '../components/live-status'
import CreateCollectionForm from '../components/create-collection-form'

export default function HomePage() {
  return (
    <div className="relative z-10 max-w-6xl mx-auto px-4 py-12 space-y-32">
      {/* Hero section */}
      <div className="text-center space-y-10 pt-16 pb-8">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md text-xs font-semibold text-purple-300 mb-4 animate-in fade-in slide-in-from-top-4 duration-1000">
          <Sparkles className="w-3.5 h-3.5 animate-pulse" />
          <span className="tracking-wider uppercase font-display font-bold">
            Aggregation Protocol v2.0
          </span>
        </div>

        <div className="space-y-4">
          <h1 className="text-6xl md:text-8xl font-display font-black tracking-tighter animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-100">
            <span className="bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
              Unify Your
            </span>
            <br />
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Digital Rhythm
            </span>
          </h1>
        </div>

        <p className="text-xl md:text-2xl text-slate-400 max-w-3xl mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
          The high-performance layer for your calendar feeds. Securely merge,
          filter, and serve your schedules with enterprise-grade latency.
        </p>

        <div className="flex flex-wrap justify-center gap-6 text-sm font-semibold text-slate-300 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
          <div className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-300 group cursor-default shadow-lg shadow-black/20">
            <Shield className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
            <span>Zero-Knowledge Proxy</span>
          </div>
          <div className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-300 group cursor-default shadow-lg shadow-black/20">
            <Zap className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
            <span>Edge-Cached Sync</span>
          </div>
          <div className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-300 group cursor-default shadow-lg shadow-black/20">
            <Globe className="w-4 h-4 text-sky-400 group-hover:scale-110 transition-transform" />
            <span>iCal Compliant</span>
          </div>
        </div>
      </div>

      {/* Main Application Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-start animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-500">
        {/* Left Column: Form */}
        <div className="lg:col-span-7 space-y-12">
          <CreateCollectionForm />

          {/* Calendar Preview Mock */}
          <div className="backdrop-blur-3xl bg-white/5 border border-white/10 rounded-[3rem] p-10 overflow-hidden relative group shadow-2xl transition-all duration-700 hover:shadow-purple-500/10 hover:border-white/20">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-blue-500/10 opacity-30"></div>

            {/* Decorative Elements */}
            <div className="absolute top-0 right-0 p-6 opacity-20 group-hover:opacity-40 transition-opacity">
              <div className="w-24 h-24 border border-white/20 rounded-full flex items-center justify-center">
                <div className="w-16 h-16 border border-white/10 rounded-full animate-spin-slow"></div>
              </div>
            </div>

            <div className="relative z-10 space-y-8">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h3 className="text-xl font-display font-black text-white flex items-center gap-3">
                    <div className="p-1.5 rounded-lg bg-purple-500/20">
                      <Calendar className="w-5 h-5 text-purple-400" />
                    </div>
                    Virtual Feed
                  </h3>
                  <p className="text-[10px] text-slate-500 uppercase tracking-[0.3em] font-bold">
                    Synchronized in real-time
                  </p>
                </div>
                <div className="flex gap-2 p-2 rounded-xl bg-black/20 border border-white/5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/40 shadow-sm shadow-red-500/20"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/40 shadow-sm shadow-yellow-500/20"></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500/40 shadow-sm shadow-green-500/20"></div>
                </div>
              </div>

              <div className="space-y-4">
                {[
                  {
                    time: '09:00 AM',
                    title: 'Product Standup',
                    source: 'Engineering',
                    color: 'bg-blue-400',
                    glow: 'shadow-blue-500/20',
                  },
                  {
                    time: '11:30 AM',
                    title: 'Design Sync',
                    source: 'Product Design',
                    color: 'bg-purple-400',
                    glow: 'shadow-purple-500/20',
                  },
                  {
                    time: '02:00 PM',
                    title: 'Customer Call',
                    source: 'Success',
                    color: 'bg-emerald-400',
                    glow: 'shadow-emerald-500/20',
                  },
                ].map((event, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-5 p-5 rounded-2xl bg-black/40 border border-white/5 hover:border-white/20 transition-all group/event hover:translate-x-1 ${i === 1 ? 'ring-1 ring-purple-500/30 bg-purple-500/5' : ''}`}
                  >
                    <div
                      className={`w-1.5 h-10 rounded-full ${event.color} ${event.glow} shadow-lg group-hover/event:scale-y-125 transition-transform duration-500`}
                    ></div>
                    <div className="flex-grow">
                      <div className="text-base font-black text-white tracking-tight">
                        {event.title}
                      </div>
                      <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mt-0.5">
                        {event.source}
                      </div>
                    </div>
                    <div className="text-xs font-mono text-slate-400 bg-white/5 px-2 py-1 rounded-md border border-white/5">
                      {event.time}
                    </div>
                  </div>
                ))}
              </div>

              {/* Progress Indicator */}
              <div className="pt-4 flex items-center gap-3">
                <div className="flex-grow h-1 bg-white/5 rounded-full overflow-hidden">
                  <div className="w-[65%] h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full animate-shimmer"></div>
                </div>
                <span className="text-[10px] font-mono text-slate-600 font-bold uppercase tracking-tighter">
                  65% Through Day
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Info & Status */}
        <div className="lg:col-span-5 space-y-10 sticky top-24">
          {/* How It Works */}
          <div className="space-y-8 p-2 relative">
            <h2 className="text-2xl font-display font-black text-white tracking-tight px-4 flex items-center gap-3">
              <div className="w-8 h-1 bg-gradient-to-r from-purple-500 to-transparent rounded-full"></div>
              How it works
            </h2>
            <div className="space-y-6 relative">
              {/* Vertical Flow Line */}
              <div className="absolute left-[2.75rem] top-10 bottom-10 w-px bg-gradient-to-b from-purple-500/50 via-slate-800 to-transparent hidden sm:block"></div>

              {[
                {
                  step: '01',
                  icon: <MousePointer2 className="w-4 h-4" />,
                  text: 'Add your source iCal URLs',
                  detail:
                    'Simply paste any public calendar link from Google, Outlook, or iCloud.',
                },
                {
                  step: '02',
                  icon: <Layers className="w-4 h-4" />,
                  text: 'Customize your metadata',
                  detail:
                    'Assign names, colors, and a custom URL identifier for your new feed.',
                },
                {
                  step: '03',
                  icon: <CheckCircle2 className="w-4 h-4" />,
                  text: 'Subscribe instantly',
                  detail:
                    'One link to rule them all. Add it to any calendar app and stay synced.',
                },
              ].map((item, i) => (
                <div
                  key={i}
                  className="flex items-start gap-6 p-6 rounded-[2rem] bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all group relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  <span className="text-2xl font-black text-slate-700 group-hover:text-purple-500 transition-colors font-mono relative z-10">
                    {item.step}
                  </span>
                  <div className="flex flex-col gap-1 relative z-10">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-slate-800 text-slate-400 group-hover:bg-purple-500/20 group-hover:text-purple-400 transition-all shadow-inner">
                        {item.icon}
                      </div>
                      <span className="text-base font-bold text-slate-200 group-hover:text-white transition-colors">
                        {item.text}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed ml-0 mt-2 max-w-[240px]">
                      {item.detail}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Live Status Card */}
          <div className="backdrop-blur-2xl bg-white/5 border border-white/10 rounded-[2.5rem] p-8 hover:bg-white/10 transition-all duration-500 shadow-2xl group">
            <div className="flex items-center gap-5 mb-8">
              <div className="p-4 rounded-[1.25rem] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 group-hover:bg-emerald-500/20 group-hover:scale-110 transition-all duration-500">
                <Terminal className="w-7 h-7" />
              </div>
              <div>
                <h2 className="text-2xl font-display font-black text-white tracking-tight">
                  System Core
                </h2>
                <p className="text-sm text-slate-400">
                  Live infrastructure performance
                </p>
              </div>
            </div>
            <LiveStatus />
          </div>
        </div>
      </div>

      {/* Feature Grid */}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-16 duration-1000 delay-700">
        {[
          {
            icon: <Layers className="w-6 h-6" />,
            title: 'Intelligent Merging',
            desc: 'Our algorithm detects duplicate events across sources and resolves conflicts in real-time.',
          },

          {
            icon: <Cpu className="w-6 h-6" />,
            title: 'Turbo-Charged Sync',
            desc: 'Proprietary caching layer ensures sub-second response times for every client request.',
          },

          {
            icon: <Lock className="w-6 h-6" />,
            title: 'Stateless Security',
            desc: 'We never store your event data permanently. Your privacy is baked into our architecture.',
          },
        ].map((feature, i) => (
          <div
            key={i}
            className="p-10 rounded-[2.5rem] bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-500 group shadow-xl relative overflow-hidden"
          >
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-purple-500/10 blur-3xl rounded-full group-hover:bg-purple-500/20 transition-all"></div>

            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center text-purple-400 mb-8 group-hover:scale-110 transition-transform duration-500 border border-white/5">
              {feature.icon}
            </div>

            <h3 className="text-2xl font-display font-black text-white mb-4 tracking-tight">
              {feature.title}
            </h3>

            <p className="text-slate-400 text-base leading-relaxed">
              {feature.desc}
            </p>
          </div>
        ))}
      </div>

      {/* Trust & Pricing Section */}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pb-20 animate-in fade-in slide-in-from-bottom-16 duration-1000 delay-900">
        {/* Testimonial/Trust */}

        <div className="p-10 rounded-[2.5rem] bg-gradient-to-br from-indigo-500/10 to-transparent border border-white/10 flex flex-col justify-between">
          <div className="space-y-6">
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map(i => (
                <Sparkles
                  key={i}
                  className="w-4 h-4 text-amber-400 fill-amber-400"
                />
              ))}
            </div>

            <blockquote className="text-2xl font-medium text-slate-200 leading-snug italic">
              &quot;This is the missing link for my project management workflow.
              I can finally see my team&apos;s velocity and my personal
              deadlines in one clean view without the subscription mess.&quot;
            </blockquote>
          </div>

          <div className="flex items-center gap-4 mt-8">
            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 p-0.5">
              <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center font-bold text-xs uppercase tracking-tighter">
                SD
              </div>
            </div>

            <div>
              <div className="text-sm font-bold text-white">Sarah Drasner</div>

              <div className="text-xs text-slate-500">VP of Engineering</div>
            </div>
          </div>
        </div>

        {/* Pricing Mock */}

        <div className="p-10 rounded-[2.5rem] bg-white/5 border border-white/10 hover:border-purple-500/30 transition-all group relative overflow-hidden">
          <div className="absolute top-0 right-0 px-6 py-2 bg-purple-500 text-[10px] font-black uppercase tracking-[0.2em] rounded-bl-2xl">
            Open Source
          </div>

          <div className="space-y-6">
            <h3 className="text-3xl font-black text-white tracking-tight">
              Community Plan
            </h3>

            <div className="flex items-baseline gap-1">
              <span className="text-5xl font-black text-white">$0</span>

              <span className="text-slate-500 font-bold uppercase text-xs tracking-widest">
                / Always Free
              </span>
            </div>

            <ul className="space-y-3">
              {[
                'Unlimited Source Calendars',

                'Instant Push Syncing',

                'Custom GUID Identifiers',

                'Zero-Log Privacy Policy',
              ].map((item, i) => (
                <li
                  key={i}
                  className="flex items-center gap-3 text-slate-300 text-sm"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />

                  {item}
                </li>
              ))}
            </ul>

            <button className="w-full py-4 rounded-2xl bg-white text-black font-black text-sm uppercase tracking-widest hover:bg-slate-200 transition-colors mt-4">
              Deploy Your Own
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
