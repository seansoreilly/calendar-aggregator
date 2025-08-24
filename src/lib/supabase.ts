import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { CalendarCollection } from '../types/calendar'
import { Database } from '../types/database'
import {
  addCollectionToStorage,
  removeCollectionFromStorage,
  updateCollectionInStorage,
  findCollectionInStorage,
  initializeStorage,
} from './utils'

// Lazy-initialized Supabase client with custom schema
let supabaseClient: SupabaseClient<Database> | null = null

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

    supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey)
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
      .schema('calendar_aggregator')
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

export async function saveCollectionToDatabase(
  collection: CalendarCollection
): Promise<CalendarCollection> {
  try {
    const supabase = getSupabase()

    // Prepare data for database insertion
    const insertData: Database['calendar_aggregator']['Tables']['collections']['Insert'] =
      {
        guid: collection.guid,
        name: collection.name,
        description: collection.description || null,
        sources: collection.calendars,
        created_at: collection.createdAt,
        updated_at: collection.updatedAt || collection.createdAt,
      }

    const { data, error } = await supabase
      .schema('calendar_aggregator')
      .from('collections')
      .insert([insertData])
      .select()
      .single()

    if (error) {
      console.error('Supabase insert error:', error)
      throw error
    }

    console.log('Successfully saved to Supabase:', data)
    return collection
  } catch (error) {
    console.error('Database save failed, falling back to memory:', error)
    addCollectionToStorage(collection)
    return collection
  }
}

export async function getAllCollectionsFromDatabase(): Promise<
  CalendarCollection[]
> {
  try {
    const supabase = getSupabase()

    const { data, error } = await supabase
      .schema('calendar_aggregator')
      .from('collections')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    return data.map(record => ({
      guid: record.guid,
      name: record.name,
      description: record.description || '',
      calendars: record.sources || [],
      createdAt: record.created_at,
      updatedAt: record.updated_at,
    }))
  } catch {
    // Fall back to memory storage when database is unavailable
    initializeStorage()
    return globalThis.calendarCollections || []
  }
}

export async function findCollectionByGuidInDatabase(
  guid: string
): Promise<CalendarCollection | null> {
  try {
    const supabase = getSupabase()

    // Use case-insensitive search for custom IDs, exact match for UUIDs
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        guid
      )

    let query = supabase
      .schema('calendar_aggregator')
      .from('collections')
      .select('*')

    if (isUuid) {
      // Exact match for UUIDs
      query = query.eq('guid', guid)
    } else {
      // Case-insensitive match for custom IDs using PostgreSQL ilike
      query = query.ilike('guid', guid)
    }

    const { data, error } = await query.single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      throw error
    }

    return {
      guid: data.guid,
      name: data.name,
      description: data.description || '',
      calendars: data.sources || [],
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    }
  } catch {
    return findCollectionInStorage(guid)
  }
}

export async function updateCollectionInDatabase(
  guid: string,
  updates: Partial<CalendarCollection>
): Promise<CalendarCollection | null> {
  try {
    const supabase = getSupabase()
    const now = new Date().toISOString()

    const updateData: Record<string, unknown> = { updated_at: now }
    if (updates.name !== undefined) updateData.name = updates.name
    if (updates.description !== undefined)
      updateData.description = updates.description
    if (updates.calendars !== undefined) {
      updateData.sources = updates.calendars
    }

    const { data, error } = await supabase
      .schema('calendar_aggregator')
      .from('collections')
      .update(updateData)
      .eq('guid', guid)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      throw error
    }

    return {
      guid: data.guid,
      name: data.name,
      description: data.description || '',
      calendars: data.sources || [],
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    }
  } catch {
    return updateCollectionInStorage(guid, updates)
  }
}

export async function deleteCollectionFromDatabase(
  guid: string
): Promise<boolean> {
  try {
    const supabase = getSupabase()
    const { error } = await supabase
      .schema('calendar_aggregator')
      .from('collections')
      .delete()
      .eq('guid', guid)

    if (error) throw error
    return true
  } catch {
    return removeCollectionFromStorage(guid)
  }
}
