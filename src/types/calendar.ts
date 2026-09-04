// Calendar source configuration
export interface CalendarSource {
  id: number
  url: string
  name: string
  color: string
  enabled: boolean
  createdAt: string
  updatedAt?: string
  lastSyncAt?: string
  syncStatus?: 'idle' | 'syncing' | 'error' | 'success'
  errorMessage?: string
}

// Calendar collection for GUID-based workflow
export interface CalendarCollection {
  guid: string
  name: string
  description?: string
  calendars: CalendarSource[]
  createdAt: string
  updatedAt?: string
  // Opaque bearer token authorizing mutations. Present on freshly-created
  // collections and returned ONCE in the POST response; it is stripped from all
  // GET responses (see mapRow / serialization). Legacy collections have none.
  managementToken?: string
}

// Extended interface for database storage with Supabase

// iCal combiner result.
// `status` is the explicit tri-state the route branches on:
//   - 'ok'      → every enabled source fetched OK (HTTP 200)
//   - 'partial' → some sources fetched, at least one failed (HTTP 206)
//   - 'failed'  → no source could be fetched (HTTP 503)
// `success` is retained for compatibility and is equivalent to status === 'ok'.
export type CombineStatus = 'ok' | 'partial' | 'failed'

export interface CombineResult {
  success: boolean
  status: CombineStatus
  icalContent: string
  eventsCount: number
  calendarsProcessed: number
  errors: string[]
  warnings: string[]
}

/**
 * Optional half-open window [lower, upper) applied to the combined feed.
 * Either bound may be absent. Built by `parseCalendarDateRange` from the
 * feed URL's start/end/past/future query params.
 */
export interface CalendarDateRange {
  lower?: Date
  upper?: Date
}

// API request types for collections
export interface CreateCollectionRequest {
  name: string
  description?: string
  customId?: string
  calendars: Array<{
    url: string
    name: string
    color?: string
    enabled?: boolean
  }>
}

export interface UpdateCollectionRequest {
  name?: string
  description?: string
  calendars?: Array<{
    url: string
    name: string
    color?: string
    enabled?: boolean
  }>
}

// Public (GET-facing) collection shape returned by the collections API —
// the management token is never included. Mirrors collection-service.ts's
// PublicCollection but is declared here for use by client components.
export type PublicCollectionResponse = Omit<
  CalendarCollection,
  'managementToken'
>

// Error body shape returned by the collections API on non-2xx responses.
export interface ApiErrorBody {
  error?: string
  code?: string
  details?: unknown
}
