import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. ' +
      'Copy .env.example to .env.local and fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
  )
}

/**
 * Supabase client configured with the anon (publishable) key only.
 * The service role key is NEVER used client-side.
 * Security is enforced via Row Level Security (RLS) policies.
 */
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)
