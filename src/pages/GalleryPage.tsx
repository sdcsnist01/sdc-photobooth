import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useGallery } from '@/hooks/useGallery'
import { GalleryHeader } from '@/components/gallery/GalleryHeader'
import { PhotoGrid } from '@/components/gallery/PhotoGrid'
import { Lightbox } from '@/components/gallery/Lightbox'
import { DownloadAllButton } from '@/components/gallery/DownloadAllButton'
import { InvalidSession } from '@/components/gallery/InvalidSession'
import type { GalleryPhoto } from '@/types/photobooth'
import { Loader2 } from 'lucide-react'

export function GalleryPage() {
  const { token } = useParams<{ token: string }>()
  const { status, session, error, reload } = useGallery(token)
  const [lightboxPhoto, setLightboxPhoto] = useState<GalleryPhoto | null>(null)

  // ─── Loading ──────────────────────────────────────────────────────────────
  if (status === 'loading') {
    return (
      <div className="min-h-dvh flex items-center justify-center flex-col gap-4">
        <Loader2 size={36} className="text-brand-400 animate-spin" />
        <p className="text-slate-400 text-sm">Loading your photos…</p>
      </div>
    )
  }

  // ─── Error / Invalid states ───────────────────────────────────────────────
  if (status !== 'loaded' || !session) {
    return <InvalidSession status={status} onRetry={reload} />
  }

  // ─── Loaded ───────────────────────────────────────────────────────────────
  const tokenSlug = token?.slice(0, 8) ?? 'photos'

  return (
    <div
      className="min-h-dvh flex flex-col"
      style={{ background: 'var(--color-surface-900)' }}
    >
      <title>Your UXplosion 3.0 Photos</title>

      <GalleryHeader photoCount={session.photoCount} createdAt={session.createdAt} />

      {session.photos.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-slate-400 text-sm">No photos found for this session.</p>
        </div>
      ) : (
        <>
          <main className="flex-1 overflow-y-auto">
            <PhotoGrid
              photos={session.photos}
              onPhotoClick={setLightboxPhoto}
            />
          </main>

          {/* Sticky download-all footer */}
          <footer className="glass-dark border-t border-white/10 p-4 sticky bottom-0">
            <DownloadAllButton photos={session.photos} tokenSlug={tokenSlug} />
          </footer>
        </>
      )}

      {/* Lightbox */}
      {lightboxPhoto && (
        <Lightbox
          photo={lightboxPhoto}
          photos={session.photos}
          onClose={() => setLightboxPhoto(null)}
          onNavigate={setLightboxPhoto}
        />
      )}

      {/* Network error banner */}
      {error && (
        <div className="fixed top-4 inset-x-4 glass-dark rounded-xl p-3 flex items-center justify-between gap-3 z-40">
          <p className="text-red-400 text-xs">{error}</p>
          <button onClick={reload} className="btn-secondary text-xs py-1 px-3">Retry</button>
        </div>
      )}
    </div>
  )
}
