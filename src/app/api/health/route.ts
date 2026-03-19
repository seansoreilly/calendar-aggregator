import { NextResponse } from 'next/server'
import { getSupabaseHealth } from '../../../lib/supabase'
import { version } from '../../../../package.json'

export async function GET() {
  try {
    console.log('[Health API] Starting health check')

    // Get Supabase health status
    const supabaseHealth = await getSupabaseHealth()

    console.log('[Health API] Supabase health result:', supabaseHealth)

    // Determine overall health status
    const isHealthy = supabaseHealth.status === 'healthy'

    return NextResponse.json(
      {
        status: isHealthy ? 'healthy' : 'degraded',
        timestamp: new Date().toISOString(),
        version,
        services: {
          supabase: supabaseHealth,
        },
      },
      {
        status: isHealthy ? 200 : 503,
      }
    )
  } catch (error) {
    console.error('[Health API] Health check failed:', error)

    return NextResponse.json(
      {
        status: 'error',
        error: 'Health check failed',
        timestamp: new Date().toISOString(),
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
