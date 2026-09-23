import { useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import { downloadAllPhotos } from '@/utils/download'
import type { GalleryPhoto } from '@/types/photobooth'

interface Props {
  photos: GalleryPhoto[]
}

export function DownloadAllButton({ photos }: Props) {
  const [isDownloading, setIsDownloading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const handleDownload = async () => {
    if (isDownloading) return
    setIsDownloading(true)
    setProgress(0)
    setError(null)

    try {
      await downloadAllPhotos(photos, setProgress)
    } catch (err) {
      setError('Download failed. Please try again.')
      console.error(err)
    } finally {
      setIsDownloading(false)
      setProgress(0)
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        id="download-all-btn"
        onClick={handleDownload}
        disabled={isDownloading || photos.length === 0}
        className="btn-primary w-full max-w-sm"
      >
        {isDownloading ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Downloading… {progress > 0 ? `${progress}%` : ''}
          </>
        ) : (
          <>
            <Download size={16} />
            Download All ({photos.length} photos)
          </>
        )}
      </button>
      {error && <p className="text-xs text-red-400 text-center">{error}</p>}
    </div>
  )
}
