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
        }
        Insert: {
          guid: string
          name: string
          description?: string | null
          sources: CalendarSource[] // JSONB type for calendar sources
          created_at: string
          updated_at: string
        }
        Update: {
          guid?: string
          name?: string
          description?: string | null
          sources?: CalendarSource[] // JSONB type for calendar sources
          created_at?: string
          updated_at?: string
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
