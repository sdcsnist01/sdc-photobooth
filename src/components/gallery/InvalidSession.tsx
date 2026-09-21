import { AlertTriangle, RefreshCw } from 'lucide-react'
import type { GalleryStatus } from '@/types/photobooth'

interface Props {
  status: GalleryStatus
  onRetry?: () => void
}

const MESSAGES: Record<string, { title: string; body: string; showRetry?: boolean }> = {
  invalid: {
    title: 'Link Not Found',
    body: 'This gallery link is invalid or has expired. Please scan the QR code at the booth again.',
  },
  failed: {
    title: 'Upload Incomplete',
    body: 'Photos for this session could not be uploaded. Please visit the photobooth and try again.',
  },
  still_uploading: {
    title: 'Photos Still Uploading',
    body: 'Your photos are still being uploaded. Please wait a moment and refresh the page.',
    showRetry: true,
  },
  error: {
    title: 'Something Went Wrong',
    body: 'We could not load your photos. Please check your connection and try again.',
    showRetry: true,
  },
}

export function InvalidSession({ status, onRetry }: Props) {
  const msg = MESSAGES[status] ?? MESSAGES['error']!

  return (
    <div className="flex flex-col items-center justify-center min-h-dvh p-6 text-center">
      <div className="glass rounded-3xl p-8 max-w-sm w-full space-y-5 fade-in">
        <AlertTriangle size={36} className="mx-auto text-amber-400" />
        <div>
          <h1 className="text-xl font-bold text-white mb-2">{msg.title}</h1>
          <p className="text-slate-300 text-sm leading-relaxed">{msg.body}</p>
        </div>
        {msg.showRetry && onRetry && (
          <button
            id="gallery-retry-btn"
            onClick={onRetry}
            className="btn-primary w-full"
          >
            <RefreshCw size={15} />
            Try Again
          </button>
        )}
        <p className="text-xs text-slate-500">SDC UXplosion 3.0 Photobooth</p>
      </div>
    </div>
  )
}
