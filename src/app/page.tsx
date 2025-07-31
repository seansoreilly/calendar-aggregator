import { Button } from '../components/ui/button'
import { Package, Terminal, Code2, Calendar, Sparkles, Zap } from 'lucide-react'

export default function HomePage() {
  return (
    <main className="min-h-screen relative overflow-hidden">
      {/* Background gradient and effects */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
        <div className="absolute top-0 -right-4 w-72 h-72 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-gray-50/50 to-white/30 dark:from-gray-900/50 dark:to-gray-800/30"></div>
      </div>

      <div className="relative z-10 py-8 px-4">
        <div className="max-w-6xl mx-auto main-container">
          {/* Hero section with glass effect */}
          <div className="text-center mb-16 backdrop-blur-sm bg-white/30 dark:bg-gray-900/30 rounded-3xl p-12 shadow-xl border border-white/20 dark:border-gray-700/20">
            <div className="flex justify-center mb-6">
              <div className="p-4 bg-gradient-to-br from-blue-400 to-purple-600 rounded-2xl shadow-2xl">
                <Calendar className="w-12 h-12 text-white" />
              </div>
            </div>
            <h1 className="text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400">
              Calendar Aggregator
            </h1>
            <p className="text-xl text-gray-700 dark:text-gray-300 mb-2">
              GUID-based Calendar Collections
            </p>
            <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Seamlessly combine multiple calendar feeds into unified iCal
              subscriptions. Perfect for teams, organizations, and personal
              productivity.
            </p>
          </div>

          {/* Feature cards with glass effect */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            <div className="group">
              <div className="backdrop-blur-md bg-white/40 dark:bg-gray-900/40 rounded-2xl p-6 shadow-xl border border-white/20 dark:border-gray-700/20 hover:shadow-2xl transition-all duration-300 hover:scale-105 hover:bg-white/50 dark:hover:bg-gray-900/50">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg shadow-lg">
                    <Package className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="font-semibold text-lg">API Endpoints</h3>
                </div>
                <div className="space-y-3 mb-4">
                  <div className="flex items-start gap-2">
                    <Sparkles className="w-3 h-3 mt-1 text-blue-500" />
                    <div>
                      <code className="text-sm bg-gray-100/50 dark:bg-gray-800/50 px-2 py-1 rounded">
                        /api/collections
                      </code>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        Manage calendar collections
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Sparkles className="w-3 h-3 mt-1 text-blue-500" />
                    <div>
                      <code className="text-sm bg-gray-100/50 dark:bg-gray-800/50 px-2 py-1 rounded">
                        /api/calendar/[guid]
                      </code>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        Get aggregated iCal feed
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Sparkles className="w-3 h-3 mt-1 text-blue-500" />
                    <div>
                      <code className="text-sm bg-gray-100/50 dark:bg-gray-800/50 px-2 py-1 rounded">
                        /api/health
                      </code>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        System health check
                      </p>
                    </div>
                  </div>
                </div>
                <Button
                  className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg"
                  size="sm"
                  asChild
                >
                  <a href="/api/health" target="_blank">
                    Test API
                  </a>
                </Button>
              </div>
            </div>

            <div className="group">
              <div className="backdrop-blur-md bg-white/40 dark:bg-gray-900/40 rounded-2xl p-6 shadow-xl border border-white/20 dark:border-gray-700/20 hover:shadow-2xl transition-all duration-300 hover:scale-105 hover:bg-white/50 dark:hover:bg-gray-900/50">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-gradient-to-br from-purple-400 to-purple-600 rounded-lg shadow-lg">
                    <Terminal className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="font-semibold text-lg">Live Example</h3>
                </div>
                <div className="space-y-3 mb-4">
                  <div className="bg-gradient-to-r from-purple-100/50 to-pink-100/50 dark:from-purple-900/20 dark:to-pink-900/20 p-3 rounded-lg">
                    <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                      Collection GUID:
                    </p>
                    <code className="text-xs font-mono text-purple-600 dark:text-purple-400 break-all">
                      4fac5413-98b8-45d1-a8b3-1c26feda1941
                    </code>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-purple-500" />
                      <span className="text-sm font-medium">1,548</span>
                    </div>
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      Combined events
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-purple-500" />
                      <span className="text-sm font-medium">874KB</span>
                    </div>
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      iCal file size
                    </span>
                  </div>
                </div>
                <Button
                  className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white shadow-lg"
                  size="sm"
                  asChild
                >
                  <a
                    href="https://www.calendar-aggregator.online/api/calendar/4fac5413-98b8-45d1-a8b3-1c26feda1941"
                    target="_blank"
                  >
                    View Feed
                  </a>
                </Button>
              </div>
            </div>

            <div className="group">
              <div className="backdrop-blur-md bg-white/40 dark:bg-gray-900/40 rounded-2xl p-6 shadow-xl border border-white/20 dark:border-gray-700/20 hover:shadow-2xl transition-all duration-300 hover:scale-105 hover:bg-white/50 dark:hover:bg-gray-900/50">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-gradient-to-br from-green-400 to-green-600 rounded-lg shadow-lg">
                    <Code2 className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="font-semibold text-lg">Quick Start</h3>
                </div>
                <div className="space-y-3 mb-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-gradient-to-br from-green-400 to-green-500 rounded-full flex items-center justify-center text-white text-xs font-bold shadow">
                      1
                    </div>
                    <div>
                      <p className="text-sm">
                        POST to{' '}
                        <code className="bg-gray-100/50 dark:bg-gray-800/50 px-2 py-0.5 rounded text-xs">
                          /api/collections
                        </code>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-gradient-to-br from-green-400 to-green-500 rounded-full flex items-center justify-center text-white text-xs font-bold shadow">
                      2
                    </div>
                    <p className="text-sm">Get your GUID from response</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-gradient-to-br from-green-400 to-green-500 rounded-full flex items-center justify-center text-white text-xs font-bold shadow">
                      3
                    </div>
                    <div>
                      <p className="text-sm">
                        Subscribe to{' '}
                        <code className="bg-gray-100/50 dark:bg-gray-800/50 px-2 py-0.5 rounded text-xs">
                          /api/calendar/[guid]
                        </code>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-gradient-to-br from-green-400 to-green-500 rounded-full flex items-center justify-center text-white text-xs font-bold shadow">
                      4
                    </div>
                    <p className="text-sm">
                      Add to Google Calendar, Outlook, etc.
                    </p>
                  </div>
                </div>
                <Button
                  className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-lg"
                  size="sm"
                  asChild
                >
                  <a
                    href="https://github.com/seansoreilly/calendar-aggregator"
                    target="_blank"
                  >
                    Documentation
                  </a>
                </Button>
              </div>
            </div>
          </div>

          {/* Detailed API Instructions */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-center mb-8 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400">
              How to Create a Collection
            </h2>
            <div className="max-w-4xl mx-auto backdrop-blur-md bg-white/40 dark:bg-gray-900/40 rounded-2xl p-8 shadow-xl border border-white/20 dark:border-gray-700/20">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-xl shadow-lg">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-2xl font-bold">POST /api/collections</h3>
              </div>
              <div className="space-y-6">
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-500" />
                    Required Parameters
                  </h4>
                  <div className="bg-gradient-to-br from-gray-100/50 to-gray-200/30 dark:from-gray-800/50 dark:to-gray-700/30 backdrop-blur-sm p-4 rounded-xl border border-gray-200/50 dark:border-gray-700/50">
                    <div className="space-y-3">
                      <div className="flex items-start gap-2">
                        <div className="mt-1 w-2 h-2 bg-indigo-500 rounded-full"></div>
                        <div>
                          <code className="font-semibold text-indigo-600 dark:text-indigo-400">
                            name
                          </code>
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {' '}
                            (string, required)
                          </span>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            Collection display name
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="mt-1 w-2 h-2 bg-indigo-500 rounded-full"></div>
                        <div className="w-full">
                          <code className="font-semibold text-indigo-600 dark:text-indigo-400">
                            calendars
                          </code>
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {' '}
                            (array, required)
                          </span>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 mb-2">
                            Array of calendar objects containing:
                          </p>
                          <div className="ml-4 space-y-2">
                            <div className="flex items-start gap-2">
                              <span className="text-indigo-400">•</span>
                              <div>
                                <code className="text-sm font-semibold text-indigo-500 dark:text-indigo-400">
                                  url
                                </code>
                                <span className="text-xs text-gray-600 dark:text-gray-400">
                                  {' '}
                                  (string, required) - iCal feed URL
                                </span>
                              </div>
                            </div>
                            <div className="flex items-start gap-2">
                              <span className="text-indigo-400">•</span>
                              <div>
                                <code className="text-sm font-semibold text-indigo-500 dark:text-indigo-400">
                                  name
                                </code>
                                <span className="text-xs text-gray-600 dark:text-gray-400">
                                  {' '}
                                  (string, required) - Calendar display name
                                </span>
                              </div>
                            </div>
                            <div className="flex items-start gap-2">
                              <span className="text-indigo-400">•</span>
                              <div>
                                <code className="text-sm font-semibold text-indigo-500 dark:text-indigo-400">
                                  color
                                </code>
                                <span className="text-xs text-gray-600 dark:text-gray-400">
                                  {' '}
                                  (string, optional) - Hex color (default:
                                  #3b82f6)
                                </span>
                              </div>
                            </div>
                            <div className="flex items-start gap-2">
                              <span className="text-indigo-400">•</span>
                              <div>
                                <code className="text-sm font-semibold text-indigo-500 dark:text-indigo-400">
                                  enabled
                                </code>
                                <span className="text-xs text-gray-600 dark:text-gray-400">
                                  {' '}
                                  (boolean, optional) - Enable calendar
                                  (default: true)
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="mt-1 w-2 h-2 bg-indigo-500 rounded-full"></div>
                        <div>
                          <code className="font-semibold text-indigo-600 dark:text-indigo-400">
                            description
                          </code>
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {' '}
                            (string, optional)
                          </span>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            Collection description
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Code2 className="w-4 h-4 text-indigo-500" />
                    Example Request
                  </h4>
                  <div className="bg-gradient-to-br from-gray-900/90 to-gray-800/90 backdrop-blur-sm p-6 rounded-xl border border-gray-700/50 shadow-xl overflow-hidden">
                    <div className="relative">
                      <div className="absolute top-0 left-0 flex gap-1.5 p-3">
                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                        <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      </div>
                      <div className="pt-10 text-sm font-mono overflow-x-auto">
                        <div className="text-green-400 mb-2">
                          # Create a collection with 2 calendars
                        </div>
                        <div className="text-gray-300">
                          <span className="text-blue-400">curl</span> -X POST{' '}
                          <span className="text-yellow-400">
                            https://www.calendar-aggregator.online/api/collections
                          </span>{' '}
                          \
                        </div>
                        <div className="text-gray-300 ml-4">
                          -H{' '}
                          <span className="text-green-400">
                            &quot;Content-Type: application/json&quot;
                          </span>{' '}
                          \
                        </div>
                        <div className="text-gray-300 ml-4">
                          -d <span className="text-green-400">&apos;{`{`}</span>
                        </div>
                        <div className="text-gray-300 ml-8">
                          <span className="text-blue-300">
                            &quot;name&quot;
                          </span>
                          :{' '}
                          <span className="text-green-400">
                            &quot;Work &amp; Personal&quot;
                          </span>
                          ,
                        </div>
                        <div className="text-gray-300 ml-8">
                          <span className="text-blue-300">
                            &quot;description&quot;
                          </span>
                          :{' '}
                          <span className="text-green-400">
                            &quot;Combined calendars&quot;
                          </span>
                          ,
                        </div>
                        <div className="text-gray-300 ml-8">
                          <span className="text-blue-300">
                            &quot;calendars&quot;
                          </span>
                          : [
                        </div>
                        <div className="text-gray-300 ml-12">{`{`}</div>
                        <div className="text-gray-300 ml-16">
                          <span className="text-blue-300">
                            &quot;name&quot;
                          </span>
                          :{' '}
                          <span className="text-green-400">
                            &quot;Google Calendar&quot;
                          </span>
                          ,
                        </div>
                        <div className="text-gray-300 ml-16">
                          <span className="text-blue-300">&quot;url&quot;</span>
                          :{' '}
                          <span className="text-green-400">
                            &quot;https://calendar.google.com/calendar/ical/your-email@gmail.com/public/basic.ics&quot;
                          </span>
                          ,
                        </div>
                        <div className="text-gray-300 ml-16">
                          <span className="text-blue-300">
                            &quot;color&quot;
                          </span>
                          :{' '}
                          <span className="text-green-400">
                            &quot;#4285f4&quot;
                          </span>
                        </div>
                        <div className="text-gray-300 ml-12">{`}`},</div>
                        <div className="text-gray-300 ml-12">{`{`}</div>
                        <div className="text-gray-300 ml-16">
                          <span className="text-blue-300">
                            &quot;name&quot;
                          </span>
                          :{' '}
                          <span className="text-green-400">
                            &quot;Outlook Calendar&quot;
                          </span>
                          ,
                        </div>
                        <div className="text-gray-300 ml-16">
                          <span className="text-blue-300">&quot;url&quot;</span>
                          :{' '}
                          <span className="text-green-400">
                            &quot;webcal://outlook.live.com/owa/calendar/xyz/reachcalendar.ics&quot;
                          </span>
                          ,
                        </div>
                        <div className="text-gray-300 ml-16">
                          <span className="text-blue-300">
                            &quot;color&quot;
                          </span>
                          :{' '}
                          <span className="text-green-400">
                            &quot;#0078d4&quot;
                          </span>
                        </div>
                        <div className="text-gray-300 ml-12">{`}`}</div>
                        <div className="text-gray-300 ml-8">]</div>
                        <div className="text-gray-300 ml-4">{`}`}&apos;</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-500" />
                    Response
                  </h4>
                  <div className="bg-gradient-to-br from-gray-900/90 to-gray-800/90 backdrop-blur-sm p-6 rounded-xl border border-gray-700/50 shadow-xl overflow-hidden">
                    <div className="relative">
                      <div className="absolute top-0 left-0 flex gap-1.5 p-3">
                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                        <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      </div>
                      <div className="pt-10 text-sm font-mono overflow-x-auto">
                        <div className="text-green-400 mb-2">
                          # You&apos;ll get back your collection with a GUID
                        </div>
                        <div className="text-gray-300">{`{`}</div>
                        <div className="text-gray-300 ml-4">
                          <span className="text-blue-300">
                            &quot;guid&quot;
                          </span>
                          :{' '}
                          <span className="text-yellow-400">
                            &quot;abc123-def456-ghi789-jkl012&quot;
                          </span>
                          ,
                        </div>
                        <div className="text-gray-300 ml-4">
                          <span className="text-blue-300">
                            &quot;name&quot;
                          </span>
                          :{' '}
                          <span className="text-green-400">
                            &quot;Work &amp; Personal&quot;
                          </span>
                          ,
                        </div>
                        <div className="text-gray-300 ml-4">
                          <span className="text-blue-300">
                            &quot;description&quot;
                          </span>
                          :{' '}
                          <span className="text-green-400">
                            &quot;Combined calendars&quot;
                          </span>
                          ,
                        </div>
                        <div className="text-gray-300 ml-4">
                          <span className="text-blue-300">
                            &quot;calendars&quot;
                          </span>
                          : [
                        </div>
                        <div className="text-gray-300 ml-8">{`{`}</div>
                        <div className="text-gray-300 ml-12">
                          <span className="text-blue-300">&quot;id&quot;</span>:{' '}
                          <span className="text-orange-400">1</span>,
                        </div>
                        <div className="text-gray-300 ml-12">
                          <span className="text-blue-300">
                            &quot;name&quot;
                          </span>
                          :{' '}
                          <span className="text-green-400">
                            &quot;Google Calendar&quot;
                          </span>
                          ,
                        </div>
                        <div className="text-gray-300 ml-12">
                          <span className="text-blue-300">&quot;url&quot;</span>
                          :{' '}
                          <span className="text-green-400">
                            &quot;https://calendar.google.com/calendar/ical/your-email@gmail.com/public/basic.ics&quot;
                          </span>
                          ,
                        </div>
                        <div className="text-gray-300 ml-12">
                          <span className="text-blue-300">
                            &quot;color&quot;
                          </span>
                          :{' '}
                          <span className="text-green-400">
                            &quot;#4285f4&quot;
                          </span>
                          ,
                        </div>
                        <div className="text-gray-300 ml-12">
                          <span className="text-blue-300">
                            &quot;enabled&quot;
                          </span>
                          : <span className="text-orange-400">true</span>,
                        </div>
                        <div className="text-gray-300 ml-12">
                          <span className="text-blue-300">
                            &quot;syncStatus&quot;
                          </span>
                          :{' '}
                          <span className="text-green-400">
                            &quot;idle&quot;
                          </span>
                        </div>
                        <div className="text-gray-300 ml-8">{`}`},</div>
                        <div className="text-gray-300 ml-8">{`{`}</div>
                        <div className="text-gray-300 ml-12">
                          <span className="text-blue-300">&quot;id&quot;</span>:{' '}
                          <span className="text-orange-400">2</span>,
                        </div>
                        <div className="text-gray-300 ml-12">
                          <span className="text-blue-300">
                            &quot;name&quot;
                          </span>
                          :{' '}
                          <span className="text-green-400">
                            &quot;Outlook Calendar&quot;
                          </span>
                          ,
                        </div>
                        <div className="text-gray-300 ml-12">
                          <span className="text-blue-300">&quot;url&quot;</span>
                          :{' '}
                          <span className="text-green-400">
                            &quot;webcal://outlook.live.com/owa/calendar/xyz/reachcalendar.ics&quot;
                          </span>
                          ,
                        </div>
                        <div className="text-gray-300 ml-12">
                          <span className="text-blue-300">
                            &quot;color&quot;
                          </span>
                          :{' '}
                          <span className="text-green-400">
                            &quot;#0078d4&quot;
                          </span>
                          ,
                        </div>
                        <div className="text-gray-300 ml-12">
                          <span className="text-blue-300">
                            &quot;enabled&quot;
                          </span>
                          : <span className="text-orange-400">true</span>,
                        </div>
                        <div className="text-gray-300 ml-12">
                          <span className="text-blue-300">
                            &quot;syncStatus&quot;
                          </span>
                          :{' '}
                          <span className="text-green-400">
                            &quot;idle&quot;
                          </span>
                        </div>
                        <div className="text-gray-300 ml-8">{`}`}</div>
                        <div className="text-gray-300 ml-4">],</div>
                        <div className="text-gray-300 ml-4">
                          <span className="text-blue-300">
                            &quot;createdAt&quot;
                          </span>
                          :{' '}
                          <span className="text-green-400">
                            &quot;2024-01-01T00:00:00.000Z&quot;
                          </span>
                        </div>
                        <div className="text-gray-300">{`}`}</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-indigo-100/50 to-purple-100/50 dark:from-indigo-900/20 dark:to-purple-900/20 backdrop-blur-sm p-6 rounded-xl border border-indigo-200/50 dark:border-indigo-700/50 shadow-lg">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="p-2 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-lg shadow">
                      <Calendar className="w-5 h-5 text-white" />
                    </div>
                    <h5 className="font-semibold text-lg">
                      Your Calendar Feed URL
                    </h5>
                  </div>
                  <div className="bg-white/50 dark:bg-gray-800/50 p-4 rounded-lg">
                    <code className="text-sm break-all">
                      <span className="text-gray-600 dark:text-gray-400">
                        https://www.calendar-aggregator.online/api/calendar/
                      </span>
                      <strong className="text-indigo-600 dark:text-indigo-400">
                        [YOUR-GUID]
                      </strong>
                    </code>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-3">
                    Add this URL to any calendar application that supports iCal
                    subscriptions
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer with glass effect */}
          <div className="text-center space-y-4 mt-16">
            <div className="backdrop-blur-md bg-white/30 dark:bg-gray-900/30 rounded-2xl p-8 shadow-xl border border-white/20 dark:border-gray-700/20 max-w-2xl mx-auto">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Created by{' '}
                <a
                  href="https://balddata.xyz"
                  className="font-semibold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 hover:from-purple-600 hover:to-blue-600 transition-all duration-300"
                  target="_blank"
                >
                  balddata.xyz
                </a>{' '}
                •{' '}
                <a
                  href="mailto:sean@balddata.xyz"
                  className="font-semibold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 hover:from-purple-600 hover:to-blue-600 transition-all duration-300"
                >
                  sean@balddata.xyz
                </a>
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                Built with Next.js 15, TypeScript, and modern serverless
                architecture
              </p>
              <div className="flex justify-center gap-2 mt-4">
                <div className="w-2 h-2 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full animate-pulse"></div>
                <div className="w-2 h-2 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full animate-pulse animation-delay-1000"></div>
                <div className="w-2 h-2 bg-gradient-to-r from-pink-400 to-blue-400 rounded-full animate-pulse animation-delay-2000"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
