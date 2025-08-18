import { Package, Terminal, Code2, Calendar, Sparkles, Zap } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="container">
      {/* Hero section */}
      <div className="card">
        <div className="header">
          <Calendar className="header-icon" />
          <div>
            <h1 className="title">Calendar Aggregator</h1>
            <p className="subtitle">GUID-based Calendar Collections</p>
          </div>
        </div>
        <p className="desc-text">
          Seamlessly combine multiple calendar feeds into unified iCal
          subscriptions. Perfect for teams, organizations, and personal
          productivity.
        </p>
      </div>

      {/* API Endpoints Card */}
      <div className="card">
        <div className="header">
          <Package className="header-icon" />
          <h2 className="title">API Endpoints</h2>
        </div>
        <ul className="api-list">
          <li className="api-item">
            <Sparkles className="api-icon" />
            <code className="api-path">/api/collections</code>
            <span className="api-desc">Create calendar collections</span>
          </li>
          <li className="api-item">
            <Sparkles className="api-icon" />
            <code className="api-path">/api/calendar/[guid]</code>
            <span className="api-desc">Get aggregated iCal feed</span>
          </li>
          <li className="api-item">
            <Sparkles className="api-icon" />
            <code className="api-path">/api/health</code>
            <span className="api-desc">System health check</span>
          </li>
        </ul>
        <a href="/api/health" target="_blank" className="btn-primary">
          Test API
        </a>
      </div>

      {/* Live Example Card */}
      <div className="card">
        <div className="header">
          <Terminal className="header-icon" />
          <h2 className="title">Live Example</h2>
        </div>
        <div className="live-example">
          <div className="live-example-title">Collection Status</div>
          <div className="live-item">
            <Zap className="live-icon" />
            <strong>Collection GUID:</strong>
            4fac5413-98b8-45d1-a8b3-1c26feda1941
          </div>
          <div className="live-item">
            <Calendar className="live-icon" />
            <strong>Combined Events:</strong>
            1,548
          </div>
          <div className="live-item">
            <Sparkles className="live-icon" />
            <strong>iCal File Size:</strong>
            874KB
          </div>
        </div>
        <a
          href="https://www.calendar-aggregator.online/api/calendar/4fac5413-98b8-45d1-a8b3-1c26feda1941"
          target="_blank"
          className="btn-primary"
        >
          View Feed
        </a>
      </div>

      {/* Quick Start Card */}
      <div className="card">
        <div className="header">
          <Code2 className="header-icon" />
          <h2 className="title">Quick Start</h2>
        </div>
        <p className="desc-text">
          Get started with the Calendar Aggregator API in 4 simple steps:
        </p>
        <ul className="api-list">
          <li className="api-item">
            <span
              style={{
                color: 'var(--color-primary)',
                fontWeight: 'bold',
                marginRight: '10px',
              }}
            >
              1.
            </span>
            POST to <code className="api-path">/api/collections</code>
          </li>
          <li className="api-item">
            <span
              style={{
                color: 'var(--color-primary)',
                fontWeight: 'bold',
                marginRight: '10px',
              }}
            >
              2.
            </span>
            Get your GUID from response
          </li>
          <li className="api-item">
            <span
              style={{
                color: 'var(--color-primary)',
                fontWeight: 'bold',
                marginRight: '10px',
              }}
            >
              3.
            </span>
            Subscribe to <code className="api-path">/api/calendar/[guid]</code>
          </li>
          <li className="api-item">
            <span
              style={{
                color: 'var(--color-primary)',
                fontWeight: 'bold',
                marginRight: '10px',
              }}
            >
              4.
            </span>
            Add to Google Calendar, Outlook, etc.
          </li>
        </ul>
        <a
          href="https://github.com/seansoreilly/calendar-aggregator"
          target="_blank"
          className="btn-link"
        >
          Documentation
        </a>
      </div>

      {/* Footer */}
      <div className="card">
        <div className="text-center">
          <p className="desc-text">
            Created by{' '}
            <a
              href="https://balddata.xyz"
              className="btn-link"
              target="_blank"
              style={{ textDecoration: 'none' }}
            >
              balddata.xyz
            </a>{' '}
            •{' '}
            <a
              href="mailto:sean@balddata.xyz"
              className="btn-link"
              style={{ textDecoration: 'none' }}
            >
              sean@balddata.xyz
            </a>
          </p>
          <p
            style={{
              fontSize: '0.875rem',
              color: 'var(--color-text-secondary)',
            }}
          >
            Built with Next.js 15, TypeScript, and modern serverless
            architecture
          </p>
        </div>
      </div>
    </div>
  )
}
