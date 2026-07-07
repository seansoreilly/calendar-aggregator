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
import { toCalendarCollectionError } from './errors'

const COLLECTIONS_SCHEMA = 'calendar_aggregator'

// PostgREST code returned by `.single()` when no rows match the query.
const POSTGREST_NO_ROWS_CODE = 'PGRST116'

// Substring of the error thrown by `getSupabase()` when env vars are absent.
const NOT_CONFIGURED_MESSAGE = 'Missing Supabase environment variables'

function isNoRowsError(error: { code?: string }): boolean {
  return error.code === POSTGREST_NO_ROWS_CODE
}

/**
 * True when the error indicates Supabase is not configured (env vars missing).
 * Only in this case is the in-memory fallback permitted — it keeps local dev
 * and the integration tests (which run without Supabase env vars) working.
 * Any other error (network, RLS, query) must surface as a real failure.
 */
function isNotConfiguredError(error: unknown): boolean {
  return (
    error instanceof Error && error.message.includes(NOT_CONFIGURED_MESSAGE)
  )
}

/**
 * Short, greppable description of a database error for structured logging.
 * Prefers the PostgREST error code, falls back to the message. Never dumps
 * full rows or row payloads.
 */
function describeDbError(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = (error as { code?: unknown }).code
    if (typeof code === 'string' && code.length > 0) return code
  }
  if (error instanceof Error) return error.message
  return 'unknown error'
}

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

function getSupabaseEnv(): {
  url: string | undefined
  anonKey: string | undefined
} {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  }
}

// Get Supabase client with lazy initialization
export function getSupabase(): SupabaseClient<Database> {
  if (!supabaseClient) {
    const { url, anonKey } = getSupabaseEnv()

    if (!url || !anonKey) {
      throw new Error(
        'Missing Supabase environment variables. Please check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set.'
      )
    }

    supabaseClient = createClient<Database>(url, anonKey)
  }

  return supabaseClient
}

/** Query builder scoped to the collections table in the app's custom schema. */
function collectionsTable() {
  return getSupabase().schema(COLLECTIONS_SCHEMA).from('collections')
}

// Test function to verify database connection
export async function testSupabaseConnection() {
  try {
    const { error } = await collectionsTable().select('*', {
      count: 'exact',
      head: true,
    })

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
    const { url, anonKey } = getSupabaseEnv()

    // Check if environment variables are configured
    if (!url || !anonKey) {
      return {
        status: 'not-configured',
        supabase: {
          connected: false,
          url: url ? 'configured' : 'missing',
          key: anonKey ? 'configured' : 'missing',
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
    const { url, anonKey } = getSupabaseEnv()

    return {
      status: 'error',
      supabase: {
        connected: false,
        url: url ? 'configured' : 'missing',
        key: anonKey ? 'configured' : 'missing',
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
    // Retained server-side so route handlers can enforce ownership on
    // PUT/DELETE. Stripped from client-facing GET responses via
    // stripManagementToken() before serialization. Null for legacy rows.
    ...(record.management_token
      ? { managementToken: record.management_token }
      : {}),
  }
}

export async function saveCollectionToDatabase(
  collection: CalendarCollection
): Promise<CalendarCollection> {
  try {
    // Prepare data for database insertion
    const insertData: Database['calendar_aggregator']['Tables']['collections']['Insert'] =
      {
        guid: collection.guid,
        name: collection.name,
        description: collection.description || null,
        sources: collection.calendars,
        created_at: collection.createdAt,
        updated_at: collection.updatedAt || collection.createdAt,
        management_token: collection.managementToken ?? null,
      }

    const { error } = await collectionsTable()
      .insert([insertData])
      .select()
      .single()

    if (error) throw error

    console.log('[db] saved collection:', collection.guid)
    return collection
  } catch (error) {
    if (isNotConfiguredError(error)) {
      addCollectionToStorage(collection)
      return collection
    }
    console.error('[db] save failed:', describeDbError(error))
    throw toCalendarCollectionError(error, 'save')
  }
}

export async function getAllCollectionsFromDatabase(): Promise<
  CalendarCollection[]
> {
  try {
    const { data, error } = await collectionsTable()
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    return data.map(mapRow)
  } catch (error) {
    if (isNotConfiguredError(error)) {
      // Not configured (local dev / tests): use in-memory storage.
      initializeStorage()
      return globalThis.calendarCollections || []
    }
    console.error('[db] getAll failed:', describeDbError(error))
    throw toCalendarCollectionError(error, 'getAll')
  }
}

export async function findCollectionByGuidInDatabase(
  guid: string
): Promise<CalendarCollection | null> {
  try {
    const baseQuery = collectionsTable().select('*')

    const { data, error } = await applyGuidFilter(baseQuery, guid).single()

    if (error) {
      if (isNoRowsError(error)) {
        return null
      }
      throw error
    }

    return mapRow(data)
  } catch (error) {
    if (isNotConfiguredError(error)) {
      return findCollectionInStorage(guid)
    }
    console.error('[db] find failed:', describeDbError(error))
    throw toCalendarCollectionError(error, 'find')
  }
}

export async function updateCollectionInDatabase(
  guid: string,
  updates: Partial<CalendarCollection>
): Promise<CalendarCollection | null> {
  try {
    const now = new Date().toISOString()

    const updateData: Database['calendar_aggregator']['Tables']['collections']['Update'] =
      { updated_at: now }
    if (updates.name !== undefined) updateData.name = updates.name
    if (updates.description !== undefined)
      updateData.description = updates.description
    if (updates.calendars !== undefined) {
      updateData.sources = updates.calendars
    }

    const baseQuery = collectionsTable().update(updateData)

    const { data, error } = await applyGuidFilter(baseQuery, guid)
      .select()
      .single()

    if (error) {
      if (isNoRowsError(error)) {
        return null
      }
      throw error
    }

    return mapRow(data)
  } catch (error) {
    if (isNotConfiguredError(error)) {
      return updateCollectionInStorage(guid, updates)
    }
    console.error('[db] update failed:', describeDbError(error))
    throw toCalendarCollectionError(error, 'update')
  }
}

export async function deleteCollectionFromDatabase(
  guid: string
): Promise<boolean> {
  try {
    const baseQuery = collectionsTable().delete()

    const { data, error } = await applyGuidFilter(baseQuery, guid).select()

    if (error) throw error
    return data.length > 0
  } catch (error) {
    if (isNotConfiguredError(error)) {
      return removeCollectionFromStorage(guid)
    }
    console.error('[db] delete failed:', describeDbError(error))
    throw toCalendarCollectionError(error, 'delete')
  }
}
