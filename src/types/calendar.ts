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

// Standard calendar event structure
export interface CalendarEvent {
  id: string
  title: string
  description?: string
  start: string // ISO 8601 datetime
  end: string // ISO 8601 datetime
  location?: string
  organizer?: {
    name?: string
    email?: string
  }
  attendees?: Array<{
    name?: string
    email?: string
    status?: 'accepted' | 'declined' | 'tentative' | 'needs-action'
  }>
  isAllDay: boolean
  isRecurring: boolean
  recurrenceRule?: string
  timezone?: string
  status?: 'confirmed' | 'tentative' | 'cancelled'
  categories?: string[]
  url?: string
  calendarId: number // Reference to source calendar
  sourceId: string // Original event ID from source
}

// Aggregated response structure
export interface AggregatedResponse {
  events: CalendarEvent[]
  pagination: {
    limit: number
    offset: number
    total: number
  }
  filters: {
    start?: string
    end?: string
    calendars?: string[]
    search?: string
  }
  timestamp: string
}

// Sync operation tracking
export interface SyncStatus {
  calendarId: number
  status: 'pending' | 'syncing' | 'completed' | 'error'
  startedAt: string
  completedAt?: string
  eventsProcessed: number
  eventsAdded: number
  eventsUpdated: number
  eventsRemoved: number
  errors: string[]
}

// Sync operation result
export interface SyncResult {
  status: 'completed' | 'partial' | 'failed'
  startedAt: string
  completedAt: string
  calendars: number
  eventsProcessed: number
  errors: string[]
  calendarResults: SyncStatus[]
}

// API request/response types
export interface CreateCalendarRequest {
  url: string
  name: string
  color?: string
  enabled?: boolean
}

export interface UpdateCalendarRequest {
  url?: string
  name?: string
  color?: string
  enabled?: boolean
}

export interface EventsQueryParams {
  start?: string
  end?: string
  calendars?: string
  search?: string
  limit?: string
  offset?: string
  format?: 'json' | 'ical'
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

// Node-ical library types (since @types/node-ical doesn't exist)
export interface ICalComponent {
  type: string
  params: Record<string, unknown>
}

export interface ICalEvent {
  type: 'VEVENT'
  summary?: string
  description?: string
  start?: Date
  end?: Date
  location?: string
  organizer?: string | { params: Record<string, unknown>; val: string }
  attendee?:
    | string
    | string[]
    | Array<{ params: Record<string, unknown>; val: string }>
  dtstart?: Date
  dtend?: Date
  uid?: string
  rrule?: unknown
  categories?: string | string[]
  url?: string
  status?: string
  [key: string]: unknown
}
