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
}

// Extended interface for database storage with Supabase

// iCal combiner result
export interface CombineResult {
  success: boolean
  icalContent: string
  eventsCount: number
  calendarsProcessed: number
  errors: string[]
  warnings: string[]
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
