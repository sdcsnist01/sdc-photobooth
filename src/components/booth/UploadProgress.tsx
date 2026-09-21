import { Upload, CheckCircle, XCircle } from 'lucide-react'
import type { CapturedPhoto } from '@/types/photobooth'

interface Props {
  photos: CapturedPhoto[]
}

export function UploadProgress({ photos }: Props) {
  const total = photos.length
  const succeeded = photos.filter((p) => p.uploadStatus === 'success').length
  const failed = photos.filter((p) => p.uploadStatus === 'failed').length
  const uploading = photos.filter((p) => p.uploadStatus === 'uploading').length

  const overallPct = total === 0 ? 0 : Math.round((succeeded / total) * 100)

  return (
    <div className="space-y-4 w-full max-w-sm">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Upload size={20} className="text-brand-400 flex-shrink-0" />
        <div>
          <p className="font-semibold text-white text-sm">
            {failed > 0
              ? `${failed} photo${failed > 1 ? 's' : ''} failed`
              : succeeded === total
              ? 'All photos uploaded!'
              : `Uploading ${succeeded + (uploading > 0 ? 1 : 0)} of ${total}…`}
          </p>
          <p className="text-xs text-slate-400">Please don't close this window</p>
        </div>
      </div>

      {/* Overall progress bar */}
      <div className="progress-bar-track">
        <div className="progress-bar-fill" style={{ width: `${overallPct}%` }} />
      </div>

      {/* Per-photo rows */}
      <div className="space-y-2">
        {photos.map((photo, i) => (
          <div key={photo.localId} className="flex items-center gap-3">
            <img
              src={photo.previewUrl}
              alt={`Photo ${i + 1}`}
              className="w-8 h-8 rounded object-cover flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-slate-300 truncate">Photo {i + 1}</span>
                {photo.uploadStatus === 'success' && (
                  <CheckCircle size={14} className="text-emerald-400 flex-shrink-0" />
                )}
                {photo.uploadStatus === 'failed' && (
                  <XCircle size={14} className="text-red-400 flex-shrink-0" />
                )}
              </div>
              <div className="progress-bar-track">
                <div
                  className="progress-bar-fill"
                  style={{ width: `${photo.uploadProgress}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
