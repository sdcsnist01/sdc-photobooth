import { useCallback, useEffect, useRef, useState } from 'react'
import { CheckCircle2, Loader2, RotateCcw, Zap } from 'lucide-react'
import { useCamera } from '@/hooks/useCamera'
import { useSession } from '@/hooks/useSession'
import { captureFrame } from '@/utils/capture'
import { CameraPreview } from '@/components/booth/CameraPreview'
import { CaptureButton } from '@/components/booth/CaptureButton'
import { PhotoStrip } from '@/components/booth/PhotoStrip'
import { PermissionGate } from '@/components/booth/PermissionGate'
import { UploadProgress } from '@/components/booth/UploadProgress'
import { SessionComplete } from '@/components/booth/SessionComplete'
import { MAX_PHOTOS_PER_SESSION } from '@/lib/constants'
import type { CapturedPhoto } from '@/types/photobooth'

export function BoothPage() {
  const camera = useCamera()
  const session = useSession()

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [flashActive, setFlashActive] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [galleryUrl, setGalleryUrl] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)

  // Request camera on mount
  useEffect(() => {
    void camera.requestCamera()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Sync the video element ref once the stream is active
  useEffect(() => {
    if (camera.status === 'active') {
      videoRef.current = document.getElementById('camera-video') as HTMLVideoElement | null
    }
  }, [camera.status])

  // beforeunload warning during active capture/upload
  useEffect(() => {
    const step = session.step
    const hasPhotos = session.photos.length > 0

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if ((step === 'capture' && hasPhotos) || step === 'uploading') {
        e.preventDefault()
        e.returnValue = ''
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [session.step, session.photos.length])

  const handleCapture = useCallback(async () => {
    if (!videoRef.current || camera.status !== 'active') return
    if (session.photos.length >= MAX_PHOTOS_PER_SESSION) return

    try {
      // Flash
      setFlashActive(true)
      setTimeout(() => setFlashActive(false), 500)

      const result = await captureFrame(videoRef.current)

      const photo: CapturedPhoto = {
        localId: crypto.randomUUID(),
        previewUrl: URL.createObjectURL(result.blob),
        blob: result.blob,
        mimeType: result.mimeType,
        width: result.width,
        height: result.height,
        captureOrder: session.photos.length,
        uploadStatus: 'pending',
        uploadProgress: 0,
        storagePath: null,
        dbId: null,
      }

      session.addPhoto(photo)
    } catch (err) {
      console.error('Capture error:', err)
    }
  }, [camera.status, session])

  const handleFinish = useCallback(async () => {
    if (session.photos.length === 0) return
    setUploadError(null)

    try {
      const { galleryUrl: url, qrDataUrl: qr } = await session.finishSession(session.photos)
      setGalleryUrl(url)
      setQrDataUrl(qr)
    } catch {
      setUploadError('Some photos failed to upload. You can retry below.')
    }
  }, [session])

  const handleNewSession = useCallback(() => {
    session.resetSession()
    setQrDataUrl(null)
    setGalleryUrl(null)
    setUploadError(null)
    // Re-request camera if it was stopped
    if (camera.status !== 'active') {
      void camera.requestCamera()
    }
  }, [session, camera])

  // ─── Render states ────────────────────────────────────────────────────────

  // Camera errors
  if (
    camera.status === 'denied' ||
    camera.status === 'unavailable' ||
    camera.status === 'disconnected'
  ) {
    return (
      <PermissionGate
        status={camera.status}
        error={camera.error}
        onRetry={() => camera.requestCamera()}
      />
    )
  }

  // Complete state
  if (session.step === 'complete' && qrDataUrl && galleryUrl) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <SessionComplete
          qrDataUrl={qrDataUrl}
          galleryUrl={galleryUrl}
          photoCount={session.photos.filter((p) => p.uploadStatus === 'success').length}
          onNewSession={handleNewSession}
        />
      </div>
    )
  }

  // Upload state
  if (session.step === 'uploading') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-6">
        <div className="flex items-center gap-3">
          <Loader2 size={24} className="text-brand-400 animate-spin" />
          <span className="text-white font-semibold text-lg">Uploading photos…</span>
        </div>
        <UploadProgress photos={session.photos} />
        {uploadError && (
          <div className="glass rounded-xl p-4 text-center space-y-3 max-w-sm w-full">
            <p className="text-red-400 text-sm">{uploadError}</p>
            <button onClick={handleFinish} className="btn-primary w-full">
              <RotateCcw size={15} />
              Retry Upload
            </button>
          </div>
        )}
      </div>
    )
  }

  // Main capture UI
  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--color-surface-900)' }}>
      {/* Header */}
      <header className="glass-dark px-5 py-3 flex items-center justify-between border-b border-white/10">
        <div className="flex items-center gap-2">
          <Zap size={18} className="text-brand-400" />
          <span className="font-bold text-white text-sm tracking-wide">SDC UXplosion 3.0</span>
        </div>
        <span className="text-slate-400 text-xs font-medium">Digital Photobooth</span>
      </header>

      {/* Body */}
      <div className="flex-1 flex gap-0 overflow-hidden">
        {/* Camera area */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 p-4 pb-2">
            {camera.status === 'requesting' ? (
              <div className="w-full h-full rounded-2xl skeleton min-h-[280px] flex items-center justify-center">
                <Loader2 size={32} className="text-slate-600 animate-spin" />
              </div>
            ) : (
              <CameraPreview
                stream={camera.stream}
                flashActive={flashActive}
                onFlip={camera.flipCamera}
                showFlip={false}
              />
            )}
          </div>

          {/* Action bar */}
          <div className="glass-dark border-t border-white/10 px-5 py-4 flex items-center justify-between">
            <CaptureButton
              photoCount={session.photos.length}
              disabled={camera.status !== 'active'}
              onCapture={() => void handleCapture()}
            />

            <div className="flex flex-col items-end gap-2">
              {session.photos.length > 0 && (
                <span className="text-xs text-slate-400">
                  {session.photos.length} photo{session.photos.length !== 1 ? 's' : ''} captured
                </span>
              )}
              <button
                id="finish-session-btn"
                onClick={() => void handleFinish()}
                disabled={session.photos.length === 0}
                className="btn-primary"
              >
                <CheckCircle2 size={16} />
                Finish ({session.photos.length})
              </button>
            </div>
          </div>
        </div>

        {/* Photo strip sidebar */}
        <aside
          className="glass-dark border-l border-white/10 flex flex-col"
          style={{ width: '180px', minWidth: '180px' }}
        >
          <div className="px-3 py-2 border-b border-white/10">
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Photos</p>
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            <PhotoStrip
              photos={session.photos}
              onDelete={session.removePhoto}
            />
          </div>
        </aside>
      </div>
    </div>
  )
}
