import { createClient } from '@supabase/supabase-js'
import { CalendarCollection, CalendarSource } from '../types/calendar'
import {
  addCollectionToStorage,
  removeCollectionFromStorage,
  updateCollectionInStorage,
  findCollectionInStorage,
} from './utils'

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

export async function saveCollectionToDatabase(
  collection: CalendarCollection
): Promise<CalendarCollection> {
  try {
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('collections')
      .insert([
        {
          guid: collection.guid,
          name: collection.name,
          description: collection.description,
          sources: collection.calendars,
          created_at: collection.createdAt,
          updated_at: collection.updatedAt || collection.createdAt,
        },
      ])
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
      .from('collections')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    return data.map(record => ({
      guid: record.guid as string,
      name: record.name as string,
      description: record.description as string,
      calendars: (record.sources as CalendarSource[]) || [],
      createdAt: record.created_at as string,
      updatedAt: record.updated_at as string,
    }))
  } catch {
    return []
  }
}

export async function findCollectionByGuidInDatabase(
  guid: string
): Promise<CalendarCollection | null> {
  try {
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('collections')
      .select('*')
      .eq('guid', guid)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      throw error
    }

    return {
      guid: data.guid as string,
      name: data.name as string,
      description: data.description as string,
      calendars: (data.sources as CalendarSource[]) || [],
      createdAt: data.created_at as string,
      updatedAt: data.updated_at as string,
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
      guid: data.guid as string,
      name: data.name as string,
      description: data.description as string,
      calendars: (data.sources as CalendarSource[]) || [],
      createdAt: data.created_at as string,
      updatedAt: data.updated_at as string,
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
      .from('collections')
      .delete()
      .eq('guid', guid)

    if (error) throw error
    return true
  } catch {
    return removeCollectionFromStorage(guid)
  }
}
