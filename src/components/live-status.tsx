'use client'

import { useState, useEffect } from 'react'

interface HealthData {
  status: string
  timestamp: string
  version: string
  services: {
    supabase: {
      status: string
      response_time_ms: number
    }
  }
}

/** Status maps to a dot colour; red is reserved for a real fault. */
function dotColor(status?: string): string {
  switch (status) {
    case 'healthy':
      return '#3F7D58'
    case 'degraded':
      return '#B8860B'
    default:
      return 'var(--today)'
  }
}

function Row({
  label,
  value,
  status,
}: {
  label: string
  value: string
  status?: string
}) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-rule py-2.5">
      <span className="text-sm text-graphite">{label}</span>
      <span className="flex items-center gap-2 font-mono text-xs text-ink">
        {status !== undefined && (
          <span
            className="h-2 w-2 shrink-0"
            style={{ backgroundColor: dotColor(status) }}
            aria-hidden="true"
          />
        )}
        {value}
      </span>
    </div>
  )
}

export default function LiveStatus() {
  const [healthData, setHealthData] = useState<HealthData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchHealthData = async () => {
      try {
        const response = await fetch('/api/health')
        if (!response.ok) {
          console.error(`Failed to fetch health data: HTTP ${response.status}`)
          setHealthData(null)
          return
        }
        const data = await response.json()
        setHealthData(data)
      } catch (error) {
        console.error('Failed to fetch health data:', error)
        setHealthData(null)
      } finally {
        setLoading(false)
      }
    }

    fetchHealthData()

    // Refresh every 30 seconds, but pause while the tab is hidden.
    let interval: ReturnType<typeof setInterval> | null = null

    const startPolling = () => {
      if (interval) return
      interval = setInterval(fetchHealthData, 30000)
    }

    const stopPolling = () => {
      if (interval) {
        clearInterval(interval)
        interval = null
      }
    }

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopPolling()
      } else {
        fetchHealthData()
        startPolling()
      }
    }

    startPolling()
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      stopPolling()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  if (loading) {
    return (
      <div className="space-y-px" aria-live="polite">
        {[0, 1, 2].map(i => (
          <div key={i} className="border-b border-rule py-2.5">
            <div className="h-4 w-2/3 animate-pulse bg-rule/60" />
          </div>
        ))}
      </div>
    )
  }

  if (!healthData) {
    return (
      <p className="border-l-2 border-today py-1 pl-4 text-sm text-graphite">
        Status is unavailable right now. The feeds themselves may still be
        working — try your subscription URL.
      </p>
    )
  }

  const statusText =
    healthData.status === 'healthy'
      ? 'Operational'
      : healthData.status === 'degraded'
        ? 'Degraded'
        : 'Error'

  const dbStatus = healthData.services.supabase.status

  return (
    <div aria-live="polite">
      <Row label="Service" value={statusText} status={healthData.status} />
      <Row
        label="Database"
        value={dbStatus === 'healthy' ? 'Connected' : 'Unreachable'}
        status={dbStatus}
      />
      <Row label="Version" value={`v${healthData.version}`} />
      <p className="pt-3 font-mono text-[11px] text-graphite">
        Checked {new Date(healthData.timestamp).toLocaleTimeString()}
      </p>
    </div>
  )
}
