import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Package, Terminal, Code2 } from 'lucide-react'

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-2">
            Calendar Aggregator{' '}
            <span className="text-muted-foreground">
              GUID-based Calendar Collections
            </span>
          </h1>
          <p className="text-muted-foreground">
            Combine multiple calendar feeds into unified iCal subscriptions
          </p>
        </div>

        <div className="grid md-grid-cols-2 lg-grid-cols-3 gap-6 mb-12">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Package className="w-4 h-4" />
                API Endpoints
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-xs space-y-1">
                <div>
                  <code>/api/collections</code> - Manage calendar collections
                </div>
                <div>
                  <code>/api/calendar/[guid]</code> - Get aggregated iCal feed
                </div>
                <div>
                  <code>/api/health</code> - System health check
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-3"
                asChild
              >
                <a href="/api/health" target="_blank">
                  Test API
                </a>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Terminal className="w-4 h-4" />
                Live Example
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-xs space-y-1">
                <div>
                  <strong>Collection GUID:</strong>
                </div>
                <div className="font-mono text-muted-foreground break-all">
                  4fac5413-98b8-45d1-a8b3-1c26feda1941
                </div>
                <div>
                  <strong>Events:</strong> 1,548 combined
                </div>
                <div>
                  <strong>Size:</strong> 874KB iCal file
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-3"
                asChild
              >
                <a
                  href="https://calendar-aggregator-jnmxvdzgo-melbourne-computing.vercel.app/api/calendar/4fac5413-98b8-45d1-a8b3-1c26feda1941"
                  target="_blank"
                >
                  View Feed
                </a>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Code2 className="w-4 h-4" />
                Quick Start
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-xs space-y-1">
                <div>
                  1. POST to <code>/api/collections</code>
                </div>
                <div>2. Get your GUID from response</div>
                <div>
                  3. Subscribe to <code>/api/calendar/[guid]</code>
                </div>
                <div>4. Add to Google Calendar, Outlook, etc.</div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-3"
                asChild
              >
                <a
                  href="https://github.com/seansoreilly/calendar-aggregator"
                  target="_blank"
                >
                  Documentation
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Detailed API Instructions */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-center mb-8">
            How to Create a Collection
          </h2>
          <Card className="max-w-4xl mx-auto">
            <CardHeader>
              <CardTitle>POST /api/collections</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2">Required Parameters:</h4>
                <div className="bg-muted p-4 rounded-lg text-sm">
                  <div className="font-mono">
                    <div>
                      <strong>name</strong> (string, required) - Collection name
                    </div>
                    <div>
                      <strong>calendars</strong> (array, required) - Array of
                      calendar objects:
                    </div>
                    <div className="ml-4">
                      <div>
                        • <strong>url</strong> (string, required) - iCal feed
                        URL
                      </div>
                      <div>
                        • <strong>name</strong> (string, required) - Calendar
                        display name
                      </div>
                      <div>
                        • <strong>color</strong> (string, optional) - Hex color
                        (default: #3b82f6)
                      </div>
                      <div>
                        • <strong>enabled</strong> (boolean, optional) - Enable
                        calendar (default: true)
                      </div>
                    </div>
                    <div>
                      <strong>description</strong> (string, optional) -
                      Collection description
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Example Request:</h4>
                <div className="bg-gray-900 text-gray-100 p-4 rounded-lg text-sm font-mono overflow-x-auto">
                  <div className="text-green-400">
                    # Create a collection with 2 calendars
                  </div>
                  <div>
                    curl -X POST
                    https://calendar-aggregator-jnmxvdzgo-melbourne-computing.vercel.app/api/collections
                    \
                  </div>
                  <div> -H &quot;Content-Type: application/json&quot; \</div>
                  <div> -d &apos;{`{`}</div>
                  <div> &quot;name&quot;: &quot;Work &amp; Personal&quot;,</div>
                  <div>
                    {' '}
                    &quot;description&quot;: &quot;Combined calendars&quot;,
                  </div>
                  <div> &quot;calendars&quot;: [</div>
                  <div> {`{`}</div>
                  <div> &quot;name&quot;: &quot;Google Calendar&quot;,</div>
                  <div>
                    {' '}
                    &quot;url&quot;:
                    &quot;https://calendar.google.com/calendar/ical/your-email@gmail.com/public/basic.ics&quot;,
                  </div>
                  <div> &quot;color&quot;: &quot;#4285f4&quot;</div>
                  <div> {`}`},</div>
                  <div> {`{`}</div>
                  <div> &quot;name&quot;: &quot;Outlook Calendar&quot;,</div>
                  <div>
                    {' '}
                    &quot;url&quot;:
                    &quot;webcal://outlook.live.com/owa/calendar/xyz/reachcalendar.ics&quot;,
                  </div>
                  <div> &quot;color&quot;: &quot;#0078d4&quot;</div>
                  <div> {`}`}</div>
                  <div> ]</div>
                  <div> {`}`}&apos;</div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Response:</h4>
                <div className="bg-gray-900 text-gray-100 p-4 rounded-lg text-sm font-mono overflow-x-auto">
                  <div className="text-green-400">
                    # You&apos;ll get back your collection with a GUID
                  </div>
                  <div>{`{`}</div>
                  <div>
                    {' '}
                    &quot;guid&quot;: &quot;abc123-def456-ghi789-jkl012&quot;,
                  </div>
                  <div> &quot;name&quot;: &quot;Work &amp; Personal&quot;,</div>
                  <div>
                    {' '}
                    &quot;description&quot;: &quot;Combined calendars&quot;,
                  </div>
                  <div> &quot;calendars&quot;: [</div>
                  <div> {`{`}</div>
                  <div> &quot;id&quot;: 1,</div>
                  <div> &quot;name&quot;: &quot;Google Calendar&quot;,</div>
                  <div>
                    {' '}
                    &quot;url&quot;:
                    &quot;https://calendar.google.com/calendar/ical/your-email@gmail.com/public/basic.ics&quot;,
                  </div>
                  <div> &quot;color&quot;: &quot;#4285f4&quot;,</div>
                  <div> &quot;enabled&quot;: true,</div>
                  <div> &quot;syncStatus&quot;: &quot;idle&quot;</div>
                  <div> {`}`},</div>
                  <div> {`{`}</div>
                  <div> &quot;id&quot;: 2,</div>
                  <div> &quot;name&quot;: &quot;Outlook Calendar&quot;,</div>
                  <div>
                    {' '}
                    &quot;url&quot;:
                    &quot;webcal://outlook.live.com/owa/calendar/xyz/reachcalendar.ics&quot;,
                  </div>
                  <div> &quot;color&quot;: &quot;#0078d4&quot;,</div>
                  <div> &quot;enabled&quot;: true,</div>
                  <div> &quot;syncStatus&quot;: &quot;idle&quot;</div>
                  <div> {`}`}</div>
                  <div> ],</div>
                  <div>
                    {' '}
                    &quot;createdAt&quot;: &quot;2024-01-01T00:00:00.000Z&quot;
                  </div>
                  <div>{`}`}</div>
                </div>
              </div>

              <div className="bg-blue-50 dark-bg-blue-900-20 p-4 rounded-lg">
                <div className="font-semibold mb-2">
                  📅 Your Calendar Feed URL:
                </div>
                <div className="font-mono text-sm">
                  https://calendar-aggregator-jnmxvdzgo-melbourne-computing.vercel.app/api/calendar/
                  <strong>[YOUR-GUID]</strong>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="text-center space-y-4">
          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              Created by{' '}
              <a
                href="https://balddata.xyz"
                className="text-primary hover:underline"
                target="_blank"
              >
                balddata.xyz
              </a>{' '}
              •{' '}
              <a
                href="mailto:sean@balddata.xyz"
                className="text-primary hover:underline"
              >
                sean@balddata.xyz
              </a>
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Built with Next.js 15, TypeScript, and modern serverless
              architecture
            </p>
          </div>
        </div>
      </div>
    </main>
  )
}
