import { useCallback, useEffect, useState } from 'react'
import type { GalleryPhoto, GallerySession, GalleryStatus } from '@/types/photobooth'

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
      const res = await fetch(`/api/gallery/${encodeURIComponent(token)}`)

      if (res.status === 404) {
        setStatus('invalid')
        return
      }
      if (!res.ok) throw new Error(`Could not load gallery (${res.status})`)

      const data = (await res.json()) as {
        status: 'loaded' | 'uploading' | 'failed'
        session?: { createdAt: string; photoCount: number }
        photos?: GalleryPhoto[]
      }

      if (data.status === 'uploading') {
        setStatus('still_uploading')
        return
      }
      if (data.status === 'failed') {
        setStatus('failed')
        return
      }

      setSession({
        createdAt: data.session?.createdAt ?? '',
        photoCount: data.session?.photoCount ?? 0,
        photos: data.photos ?? [],
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
