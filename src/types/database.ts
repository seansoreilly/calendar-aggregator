import { CalendarSource } from './calendar'

export interface Database {
  calendar_aggregator: {
    Tables: {
      collections: {
        Row: {
          guid: string
          name: string
          description: string | null
          sources: CalendarSource[] // JSONB type for calendar sources
          created_at: string
          updated_at: string
          // Nullable: legacy rows created before migration 004 have no token.
          management_token: string | null
        }
        Insert: {
          guid: string
          name: string
          description?: string | null
          sources: CalendarSource[] // JSONB type for calendar sources
          created_at: string
          updated_at: string
          management_token?: string | null
        }
        Update: {
          guid?: string
          name?: string
          description?: string | null
          sources?: CalendarSource[] // JSONB type for calendar sources
          created_at?: string
          updated_at?: string
          management_token?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
