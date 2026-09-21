import { X } from 'lucide-react'
import type { CapturedPhoto } from '@/types/photobooth'

interface Props {
  photo: CapturedPhoto
  index: number
  onDelete: (localId: string) => void
}

const STATUS_INDICATOR: Record<string, string> = {
  pending: 'bg-slate-500',
  uploading: 'bg-yellow-400 animate-pulse',
  success: 'bg-emerald-400',
  failed: 'bg-red-500',
}

export function PhotoThumbnail({ photo, index, onDelete }: Props) {
  return (
    <div className="relative group fade-in flex-none w-24 md:w-auto">
      <div className="relative rounded-xl overflow-hidden aspect-square bg-[#0A0A0C] border border-white/[0.09] shadow-card">
        <img
          src={photo.previewUrl}
          alt={`Photo ${index + 1}`}
          className="w-full h-full object-contain"
          loading="lazy"
        />

        {/* Status dot */}
        <span
          className={`absolute bottom-1.5 left-1.5 w-2 h-2 rounded-full ${STATUS_INDICATOR[photo.uploadStatus] ?? 'bg-slate-500'}`}
          title={photo.uploadStatus}
        />

        {/* Upload progress overlay */}
        {photo.uploadStatus === 'uploading' && (
          <div className="absolute inset-x-0 bottom-0 h-1 bg-black/30">
            <div
              className="h-full bg-brand-500 transition-all duration-300"
              style={{ width: `${photo.uploadProgress}%` }}
            />
          </div>
        )}
      </div>

      {/* Photo number badge */}
      <span className="absolute top-1 left-1.5 text-[10px] font-bold text-white/70 bg-black/40 rounded px-1">
        {index + 1}
      </span>

      {/* Delete button — always visible (no hover on touch screens) */}
      <button
        id={`delete-photo-${photo.localId}`}
        onClick={() => onDelete(photo.localId)}
        disabled={photo.uploadStatus === 'uploading'}
        className="btn-danger absolute top-1.5 right-1.5 w-8 h-8 p-0 bg-black/60 backdrop-blur-sm"
        aria-label={`Delete photo ${index + 1}`}
        title="Delete photo"
      >
        <X size={16} />
      </button>
    </div>
  )
}
