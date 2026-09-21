-- SDC UXplosion 3.0 Photobooth – Secure schema (run AFTER 001, in the Supabase SQL Editor)
--
-- All access now goes through Vercel API routes using the service-role key,
-- which bypasses RLS. The anon role gets NO access to tables or storage.
-- Safe to run more than once.

-- ─── 1. Booth write credential ───────────────────────────────────────────────

ALTER TABLE public.sessions
  ADD COLUMN IF NOT EXISTS booth_token UUID NOT NULL DEFAULT gen_random_uuid();

CREATE UNIQUE INDEX IF NOT EXISTS idx_sessions_booth_token
  ON public.sessions (booth_token);

-- Makes upload retries idempotent (same photo path = same row)
CREATE UNIQUE INDEX IF NOT EXISTS idx_photos_session_path
  ON public.photos (session_id, storage_path);

-- ─── 2. Remove every anon policy from 001 ────────────────────────────────────

DROP POLICY IF EXISTS "anon_insert_sessions"       ON public.sessions;
DROP POLICY IF EXISTS "anon_select_sessions"       ON public.sessions;
DROP POLICY IF EXISTS "anon_update_sessions"       ON public.sessions;
DROP POLICY IF EXISTS "anon_insert_photos"         ON public.photos;
DROP POLICY IF EXISTS "anon_select_photos"         ON public.photos;
DROP POLICY IF EXISTS "anon_insert_photos_storage" ON storage.objects;
DROP POLICY IF EXISTS "anon_select_photos_storage" ON storage.objects;

-- RLS stays enabled with zero policies = deny all for anon.
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photos   ENABLE ROW LEVEL SECURITY;

-- ─── 3. Bucket must be private ───────────────────────────────────────────────
-- (Dashboard → Storage → photos → make sure "Public bucket" is OFF.)
UPDATE storage.buckets SET public = false WHERE id = 'photos';
