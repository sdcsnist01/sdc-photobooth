// Supabase database types — matches schema in supabase/migrations/001_initial_schema.sql

export type SessionStatus = 'uploading' | 'complete' | 'failed'

export interface DbSession {
  id: string
  secure_token: string
  status: SessionStatus
  created_at: string
  completed_at: string | null
  photo_count: number
  expires_at: string | null
}

export interface DbPhoto {
  id: string
  session_id: string
  storage_path: string
  filename: string
  file_size: number | null
  width: number | null
  height: number | null
  mime_type: string
  capture_order: number
  created_at: string
}
