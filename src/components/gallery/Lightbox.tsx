import { useEffect } from 'react'
import { X, Download, ChevronLeft, ChevronRight } from 'lucide-react'
import type { GalleryPhoto } from '@/types/photobooth'
import { downloadSinglePhoto } from '@/utils/download'

interface Props {
  photo: GalleryPhoto
  photos: GalleryPhoto[]
  onClose: () => void
  onNavigate: (photo: GalleryPhoto) => void
}

export function Lightbox({ photo, photos, onClose, onNavigate }: Props) {
  const currentIndex = photos.findIndex((p) => p.id === photo.id)
  const hasPrev = currentIndex > 0
  const hasNext = currentIndex < photos.length - 1

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft' && hasPrev) onNavigate(photos[currentIndex - 1]!)
      if (e.key === 'ArrowRight' && hasNext) onNavigate(photos[currentIndex + 1]!)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose, onNavigate, photos, currentIndex, hasPrev, hasNext])

  return (
    <div
      className="lightbox-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Photo viewer"
    >
      {/* Image */}
      <img
        src={photo.signedUrl}
        alt={photo.filename}
        className="max-w-full max-h-[85dvh] object-contain rounded-xl shadow-card"
        onClick={(e) => e.stopPropagation()}
        draggable={false}
      />

      {/* Top bar */}
      <div className="absolute top-4 inset-x-4 flex items-center justify-between">
        <span className="text-white/60 text-sm font-medium">
          {currentIndex + 1} / {photos.length}
        </span>
        <div className="flex items-center gap-2">
          <button
            id="lightbox-download-btn"
            onClick={(e) => { e.stopPropagation(); downloadSinglePhoto(photo.signedUrl, photo.filename) }}
            className="glass rounded-full p-2 text-white hover:bg-white/20 transition-all"
            aria-label="Download photo"
          >
            <Download size={18} />
          </button>
          <button
            id="lightbox-close-btn"
            onClick={onClose}
            className="glass rounded-full p-2 text-white hover:bg-white/20 transition-all"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Navigation arrows */}
      {hasPrev && (
        <button
          id="lightbox-prev-btn"
          onClick={(e) => { e.stopPropagation(); onNavigate(photos[currentIndex - 1]!) }}
          className="absolute left-4 top-1/2 -translate-y-1/2 glass rounded-full p-3 text-white hover:bg-white/20 transition-all"
          aria-label="Previous photo"
        >
          <ChevronLeft size={22} />
        </button>
      )}
      {hasNext && (
        <button
          id="lightbox-next-btn"
          onClick={(e) => { e.stopPropagation(); onNavigate(photos[currentIndex + 1]!) }}
          className="absolute right-4 top-1/2 -translate-y-1/2 glass rounded-full p-3 text-white hover:bg-white/20 transition-all"
          aria-label="Next photo"
        >
          <ChevronRight size={22} />
        </button>
      )}
    </div>
  )
}
