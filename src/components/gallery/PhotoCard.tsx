import { Download } from 'lucide-react'
import type { GalleryPhoto } from '@/types/photobooth'
import { downloadSinglePhoto } from '@/utils/download'

interface Props {
  photo: GalleryPhoto
  index: number
  onClick: (photo: GalleryPhoto) => void
}

export function PhotoCard({ photo, index, onClick }: Props) {
  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation()
    downloadSinglePhoto(photo.signedUrl, photo.filename)
  }

  return (
    <div
      className="group relative rounded-2xl overflow-hidden bg-surface-800 shadow-card cursor-pointer fade-in"
      style={{ animationDelay: `${index * 60}ms` }}
      onClick={() => onClick(photo)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick(photo)}
      aria-label={`View photo ${index + 1}`}
    >
      <div className="aspect-square relative">
        <img
          src={photo.signedUrl}
          alt={`Photo ${index + 1}`}
          className="w-full h-full object-contain"
          loading="lazy"
          onError={(e) => {
            // If signed URL has expired, show broken state
            const img = e.currentTarget
            img.style.opacity = '0.3'
          }}
        />

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-200 flex items-center justify-center">
          <span className="text-white text-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
            View
          </span>
        </div>
      </div>

      {/* Download button */}
      <button
        id={`download-photo-${photo.id}`}
        onClick={handleDownload}
        className="absolute bottom-2 right-2 glass rounded-full p-2.5 transition-all text-white hover:bg-white/20"
        aria-label={`Download photo ${index + 1}`}
        title="Download"
      >
        <Download size={14} />
      </button>
    </div>
  )
}
