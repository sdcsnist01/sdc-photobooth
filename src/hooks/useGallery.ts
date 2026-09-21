import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { STORAGE_BUCKET, SIGNED_URL_EXPIRY } from '@/lib/constants'
import type { GalleryPhoto, GallerySession, GalleryStatus } from '@/types/photobooth'
import type { DbSession, DbPhoto } from '@/types/database'

export function useGallery(token: string | undefined) {
  const [status, setStatus] = useState<GalleryStatus>('loading')
  const [session, setSession] = useState<GallerySession | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!token) {
      setStatus('invalid')
      return
    }

    setStatus('loading')
    setError(null)

    try {
      // 1. Look up session by secure_token
      const { data: sessionRow, error: sessionError } = await supabase
        .from('sessions')
        .select('id, status, photo_count, created_at')
        .eq('secure_token', token)
        .maybeSingle()

      if (sessionError) throw new Error(sessionError.message)

      if (!sessionRow) {
        setStatus('invalid')
        return
      }

      const row = sessionRow as Pick<DbSession, 'id' | 'status' | 'photo_count' | 'created_at'>

      if (row.status === 'uploading') {
        setStatus('still_uploading')
        return
      }

      if (row.status === 'failed') {
        setStatus('failed')
        return
      }

      // 2. Fetch photos ordered by capture_order
      const { data: photoRows, error: photosError } = await supabase
        .from('photos')
        .select('id, storage_path, filename, capture_order, width, height, mime_type')
        .eq('session_id', row.id)
        .order('capture_order', { ascending: true })

      if (photosError) throw new Error(photosError.message)

      const photos = (photoRows ?? []) as Pick<
        DbPhoto,
        'id' | 'storage_path' | 'filename' | 'capture_order' | 'width' | 'height' | 'mime_type'
      >[]

      // 3. Generate signed URLs for all photos
      const signedPhotos: GalleryPhoto[] = await Promise.all(
        photos.map(async (photo) => {
          const { data: urlData, error: urlError } = await supabase.storage
            .from(STORAGE_BUCKET)
            .createSignedUrl(photo.storage_path, SIGNED_URL_EXPIRY)

          if (urlError || !urlData?.signedUrl) {
            throw new Error(`Could not generate URL for photo ${photo.id}`)
          }

          return {
            id: photo.id,
            filename: photo.filename,
            storagePath: photo.storage_path,
            captureOrder: photo.capture_order,
            width: photo.width,
            height: photo.height,
            mimeType: photo.mime_type,
            signedUrl: urlData.signedUrl,
          }
        })
      )

      setSession({
        id: row.id,
        createdAt: row.created_at,
        photoCount: row.photo_count,
        photos: signedPhotos,
      })
      setStatus('loaded')
    } catch (err) {
      console.error('Gallery load error:', err)
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.')
      setStatus('error')
    }
  }, [token])

  useEffect(() => {
    void load()
  }, [load])

  return { status, session, error, reload: load }
}
