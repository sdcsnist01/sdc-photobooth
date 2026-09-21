import type { GalleryPhoto } from '@/types/photobooth'
import { PhotoCard } from './PhotoCard'

interface Props {
  photos: GalleryPhoto[]
  onPhotoClick: (photo: GalleryPhoto) => void
}

export function PhotoGrid({ photos, onPhotoClick }: Props) {
  return (
    <div className="photo-gallery-grid p-4">
      {photos.map((photo, index) => (
        <PhotoCard
          key={photo.id}
          photo={photo}
          index={index}
          onClick={onPhotoClick}
        />
      ))}
    </div>
  )
}
