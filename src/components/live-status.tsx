'use client'

import { useState, useEffect } from 'react'
import { Zap, Sparkles, Database } from 'lucide-react'

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
      <div className="space-y-4">
        <div className="text-lg font-semibold text-green-300 mb-4">
          System Status
        </div>
        <div className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-gray-500/20 to-gray-600/20 border border-white/10 animate-pulse">
          <div className="w-5 h-5 bg-gray-400 rounded animate-pulse"></div>
          <span className="text-gray-300">Loading system status...</span>
        </div>
      </div>
    )
  }

  const isHealthy = healthData?.status === 'healthy'
  const statusColor = isHealthy
    ? 'green'
    : healthData?.status === 'degraded'
      ? 'yellow'
      : 'red'
  const statusText = isHealthy
    ? 'All Systems Operational'
    : healthData?.status === 'degraded'
      ? 'Degraded Performance'
      : 'System Error'

  return (
    <div className="space-y-4">
      <div className="text-lg font-semibold text-green-300 mb-4">
        System Status
      </div>

      {/* Overall Status */}
      <div
        className={`flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-${statusColor}-500/20 to-${statusColor}-600/20 border border-white/10`}
      >
        <div
          className={`w-3 h-3 bg-${statusColor}-400 rounded-full ${isHealthy ? 'animate-pulse' : ''}`}
        ></div>
        <span className="text-white font-medium">System Status:</span>
        <span className={`text-${statusColor}-300 font-bold ml-auto`}>
          {statusText}
        </span>
      </div>

      {/* Database Status */}
      <div className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-blue-500/20 to-indigo-500/20 border border-white/10">
        <Database className="w-5 h-5 text-blue-300" />
        <span className="text-white font-medium">Database:</span>
        <span
          className={`text-${healthData?.services.supabase.status === 'healthy' ? 'green' : 'red'}-300 font-bold ml-auto`}
        >
          {healthData?.services.supabase.status === 'healthy'
            ? 'Connected'
            : 'Error'}
        </span>
      </div>

      {/* Response Time */}
      <div className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-white/10">
        <Zap className="w-5 h-5 text-purple-300" />
        <span className="text-white font-medium">Response Time:</span>
        <span className="text-purple-300 font-bold text-lg ml-auto">
          {healthData?.services.supabase.response_time_ms || 0}ms
        </span>
      </div>

      {/* Version */}
      <div className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-cyan-500/20 to-teal-500/20 border border-white/10">
        <Sparkles className="w-5 h-5 text-cyan-300" />
        <span className="text-white font-medium">API Version:</span>
        <span className="text-cyan-300 font-bold ml-auto">
          v{healthData?.version}
        </span>
      </div>

      {/* Last Updated */}
      <div className="text-xs text-gray-400 text-center">
        Last updated:{' '}
        {healthData?.timestamp
          ? new Date(healthData.timestamp).toLocaleTimeString()
          : 'Unknown'}
      </div>
    </div>
  )
}
