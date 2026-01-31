'use client'

import { useState, useEffect } from 'react'
import { Zap, Sparkles, Database, Activity } from 'lucide-react'

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

export default function LiveStatus() {
  const [healthData, setHealthData] = useState<HealthData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchHealthData = async () => {
      try {
        const response = await fetch('/api/health')
        const data = await response.json()
        setHealthData(data)
      } catch (error) {
        console.error('Failed to fetch health data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchHealthData()
    // Refresh every 30 seconds
    const interval = setInterval(fetchHealthData, 30000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="space-y-3 animate-pulse">
        {[1, 2, 3, 4].map(i => (
          <div
            key={i}
            className="h-14 rounded-2xl bg-white/5 border border-white/5"
          />
        ))}
      </div>
    )
  }

  const isHealthy = healthData?.status === 'healthy'

  // Helper to get color classes based on status
  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'healthy':
        return {
          bg: 'bg-green-500/20',
          border: 'border-green-500/20',
          text: 'text-green-300',
          icon: 'text-green-400',
        }
      case 'degraded':
        return {
          bg: 'bg-yellow-500/20',
          border: 'border-yellow-500/20',
          text: 'text-yellow-300',
          icon: 'text-yellow-400',
        }
      default:
        return {
          bg: 'bg-red-500/20',
          border: 'border-red-500/20',
          text: 'text-red-300',
          icon: 'text-red-400',
        }
    }
  }

  const mainStatus = getStatusColor(healthData?.status)
  const dbStatus = getStatusColor(healthData?.services.supabase.status)

  const statusText = isHealthy
    ? 'Operational'
    : healthData?.status === 'degraded'
      ? 'Degraded'
      : 'System Error'

  return (
    <div className="space-y-4">
      {/* Overall Status */}
      <div
        className={`flex items-center gap-4 p-4 rounded-2xl border ${mainStatus.bg} ${mainStatus.border} transition-colors duration-300`}
      >
        <div className={`p-2 rounded-lg bg-black/20 ${mainStatus.text}`}>
          <Activity className="w-5 h-5" />
        </div>
        <span className="text-white font-medium">System Status</span>
        <span
          className={`${mainStatus.text} font-bold ml-auto flex items-center gap-2`}
        >
          {isHealthy && (
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
          )}
          {statusText}
        </span>
      </div>

      {/* Database Status */}
      <div
        className={`flex items-center gap-4 p-4 rounded-2xl border transition-colors duration-300 ${dbStatus.bg} ${dbStatus.border}`}
      >
        <div className="p-2 rounded-lg bg-black/20 text-blue-300">
          <Database className="w-5 h-5" />
        </div>
        <span className="text-white font-medium">Database</span>
        <span className={`${dbStatus.text} font-bold ml-auto`}>
          {healthData?.services.supabase.status === 'healthy'
            ? 'Connected'
            : 'Error'}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Response Time */}
        <div className="flex flex-col gap-2 p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
          <div className="flex items-center gap-2 text-purple-300 mb-1">
            <Zap className="w-4 h-4" />
            <span className="text-xs uppercase font-semibold tracking-wider">
              Latency
            </span>
          </div>
          <span className="text-2xl font-bold text-white">
            {healthData?.services.supabase.response_time_ms || 0}
            <span className="text-sm text-gray-400 font-normal ml-1">ms</span>
          </span>
        </div>

        {/* Version */}
        <div className="flex flex-col gap-2 p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
          <div className="flex items-center gap-2 text-cyan-300 mb-1">
            <Sparkles className="w-4 h-4" />
            <span className="text-xs uppercase font-semibold tracking-wider">
              Version
            </span>
          </div>
          <span className="text-2xl font-bold text-white">
            v{healthData?.version}
          </span>
        </div>
      </div>

      {/* Last Updated */}
      <div className="text-xs text-gray-500 text-right pt-2 font-mono">
        Updated:{' '}
        {healthData?.timestamp
          ? new Date(healthData.timestamp).toLocaleTimeString()
          : '--:--:--'}
      </div>
    </div>
  )
}
