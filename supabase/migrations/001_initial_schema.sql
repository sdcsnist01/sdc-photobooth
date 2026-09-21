-- SDC UXplosion 3.0 Photobooth – Initial Schema
-- Run this once in the Supabase SQL Editor.

-- ─────────────────────────────────────────────────────────────────────────────
-- Extensions
-- ─────────────────────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─────────────────────────────────────────────────────────────────────────────
-- sessions
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.sessions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  secure_token UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  status       TEXT NOT NULL DEFAULT 'uploading'
               CHECK (status IN ('uploading', 'complete', 'failed')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  photo_count  INT NOT NULL DEFAULT 0,
  expires_at   TIMESTAMPTZ  -- NULL = no expiry; reserved for future use
);

CREATE INDEX IF NOT EXISTS idx_sessions_secure_token
  ON public.sessions (secure_token);

-- ─────────────────────────────────────────────────────────────────────────────
-- photos
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.photos (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id     UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  storage_path   TEXT NOT NULL,
  filename       TEXT NOT NULL,
  file_size      BIGINT,
  width          INT,
  height         INT,
  mime_type      TEXT NOT NULL DEFAULT 'image/webp',
  capture_order  INT NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_photos_session_id
  ON public.photos (session_id, capture_order);

-- ─────────────────────────────────────────────────────────────────────────────
-- Row Level Security — sessions
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

-- Booth: any anon client can create a session
CREATE POLICY "anon_insert_sessions"
  ON public.sessions FOR INSERT TO anon
  WITH CHECK (true);

-- Gallery + Booth: anon can read sessions (filtered by secure_token in WHERE clause;
-- UUID v4 space 2^122 makes enumeration impossible)
CREATE POLICY "anon_select_sessions"
  ON public.sessions FOR SELECT TO anon
  USING (true);

-- Booth: anon can update status to 'complete' or 'failed'
CREATE POLICY "anon_update_sessions"
  ON public.sessions FOR UPDATE TO anon
  USING (true)
  WITH CHECK (status IN ('complete', 'failed'));

-- ─────────────────────────────────────────────────────────────────────────────
-- Row Level Security — photos
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;

-- Booth: insert photos
CREATE POLICY "anon_insert_photos"
  ON public.photos FOR INSERT TO anon
  WITH CHECK (true);

-- Gallery + Booth: read photos (filtered by session_id in WHERE clause)
CREATE POLICY "anon_select_photos"
  ON public.photos FOR SELECT TO anon
  USING (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- Storage bucket + policies
-- Create the bucket manually in the Supabase Dashboard first, then run these.
-- Bucket name: photos
-- Visibility:  Private
-- Max upload size: 10 MB
-- Allowed MIME types: image/webp, image/jpeg
-- ─────────────────────────────────────────────────────────────────────────────

-- Allow anon to upload to the photos bucket
CREATE POLICY "anon_insert_photos_storage"
  ON storage.objects FOR INSERT TO anon
  WITH CHECK (bucket_id = 'photos');

-- Allow anon to read (for signed URL generation)
CREATE POLICY "anon_select_photos_storage"
  ON storage.objects FOR SELECT TO anon
  USING (bucket_id = 'photos');
