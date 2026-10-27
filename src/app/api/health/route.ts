import { NextResponse } from 'next/server'
import { getSupabaseHealth } from '../../../lib/supabase'
import { version as packageVersion } from '../../../../package.json'

// package.json is no longer bumped per commit, so append the deployed commit
// (semver build metadata) to tell deployments apart.
const commitSha = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7)
const version = commitSha ? `${packageVersion}+${commitSha}` : packageVersion

export async function GET(): Promise<NextResponse> {
  try {
    // Get Supabase health status
    const supabaseHealth = await getSupabaseHealth()

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
