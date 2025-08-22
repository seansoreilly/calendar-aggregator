import { createClient } from '@supabase/supabase-js'

// Lazy-initialized Supabase client with custom schema
let supabaseClient: ReturnType<typeof createClient> | null = null

// Get Supabase client with lazy initialization
export function getSupabase() {
  if (!supabaseClient) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error(
        'Missing Supabase environment variables. Please check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set.'
      )
    }

    supabaseClient = createClient(supabaseUrl, supabaseAnonKey)
  }

  return supabaseClient
}

// Export client getter for convenience
export const supabase = getSupabase

// Test function to verify database connection
export async function testSupabaseConnection() {
  try {
    const client = getSupabase()
    const { error } = await client
      .from('collections')
      .select('*', { count: 'exact', head: true })

    if (error) throw error

    return {
      success: true,
      message: 'Supabase connection successful',
      tablesAccessible: true,
    }
  } catch (error) {
    console.error('Supabase connection error:', error)

    // Return detailed error information for debugging
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error,
    }
  }
}

// Health check function for API endpoint
export async function getSupabaseHealth() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    // Check if environment variables are configured
    const envConfigured = !!(supabaseUrl && supabaseAnonKey)

    if (!envConfigured) {
      return {
        status: 'not-configured',
        supabase: {
          connected: false,
          url: supabaseUrl ? 'configured' : 'missing',
          key: supabaseAnonKey ? 'configured' : 'missing',
        },
        timestamp: new Date().toISOString(),
        message: 'Supabase environment variables not configured',
      }
    }

    const connectionTest = await testSupabaseConnection()

    return {
      status: connectionTest.success ? 'healthy' : 'error',
      supabase: {
        connected: connectionTest.success,
        url: 'configured',
        key: 'configured',
      },
      timestamp: new Date().toISOString(),
      details: connectionTest.success ? undefined : connectionTest.error,
    }
  } catch (error) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    return {
      status: 'error',
      supabase: {
        connected: false,
        url: supabaseUrl ? 'configured' : 'missing',
        key: supabaseAnonKey ? 'configured' : 'missing',
      },
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
