import { Images } from 'lucide-react'
import type { CapturedPhoto } from '@/types/photobooth'
import { PhotoThumbnail } from './PhotoThumbnail'

interface Props {
  photos: CapturedPhoto[]
  onDelete: (localId: string) => void
}

export function PhotoStrip({ photos, onDelete }: Props) {
  if (photos.length === 0) {
    return (
      <div className="flex flex-row md:flex-col items-center justify-center h-full gap-3 text-[#7A7278]">
        <Images size={36} strokeWidth={1.5} className="text-[#FF6FA8]/60" />
        <p className="text-sm text-center leading-snug">
          Photos you take will<br className="hidden md:inline" /> appear here
        </p>
      </div>
    )
  }

  return (
    <div className="photo-strip">
      {photos.map((photo, index) => (
        <PhotoThumbnail
          key={photo.localId}
          photo={photo}
          index={index}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}
