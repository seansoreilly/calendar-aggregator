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
import { UUID_REGEX } from './validation'

/**
 * Escape special LIKE/ILIKE wildcard characters in a pattern string.
 * PostgreSQL LIKE/ILIKE treats `%` (any string), `_` (any single char), and
 * `\` (escape char) as special. supabase-js does NOT escape these automatically,
 * so a custom slug like `s_ansoreilly` would match `seansoreilly` without this.
 */
export function escapeLikePattern(s: string): string {
  // Order matters: escape backslash first to avoid double-escaping
  return s.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_')
}

/**
 * Minimal structural interface for the Supabase filter builder methods we use.
 * Using a structural type avoids importing the deeply-parameterised internal
 * class while still being fully typed at the call sites.
 */
interface GuidFilterable<T extends GuidFilterable<T>> {
  eq(column: string, value: string): T
  ilike(column: string, pattern: string): T
}

/**
 * Apply the correct GUID filter to a Supabase query builder.
 * UUIDs use exact `.eq` match; custom slugs use case-insensitive `.ilike`
 * with LIKE wildcards escaped so that `_` in the slug matches only itself.
 */
export function applyGuidFilter<T extends GuidFilterable<T>>(
  query: T,
  guid: string
): T {
  if (UUID_REGEX.test(guid)) {
    return query.eq('guid', guid)
  }
  return query.ilike('guid', escapeLikePattern(guid))
}

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

function mapRow(
  record: Database['calendar_aggregator']['Tables']['collections']['Row']
): CalendarCollection {
  return {
    guid: record.guid,
    name: record.name,
    description: record.description || '',
    calendars: record.sources || [],
    createdAt: record.created_at,
    updatedAt: record.updated_at,
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

    return data.map(mapRow)
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

    const baseQuery = supabase
      .schema('calendar_aggregator')
      .from('collections')
      .select('*')

    const { data, error } = await applyGuidFilter(baseQuery, guid).single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      throw error
    }

    return mapRow(data)
  } catch (error) {
    console.error('findCollectionByGuidInDatabase failed, falling back to memory:', error)
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

    const baseQuery = supabase
      .schema('calendar_aggregator')
      .from('collections')
      .update(updateData)

    const { data, error } = await applyGuidFilter(baseQuery, guid)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      throw error
    }

    return mapRow(data)
  } catch (error) {
    console.error('updateCollectionInDatabase failed, falling back to memory:', error)
    return updateCollectionInStorage(guid, updates)
  }
}

export async function deleteCollectionFromDatabase(
  guid: string
): Promise<boolean> {
  try {
    const supabase = getSupabase()

    const baseQuery = supabase
      .schema('calendar_aggregator')
      .from('collections')
      .delete()

    const { data, error } = await applyGuidFilter(baseQuery, guid).select()

    if (error) throw error
    return data.length > 0
  } catch (error) {
    console.error('deleteCollectionFromDatabase failed, falling back to memory:', error)
    return removeCollectionFromStorage(guid)
  }
}
