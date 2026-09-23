import { useCallback, useEffect, useRef, useState } from 'react'
import { CheckCircle2, Loader2, RotateCcw } from 'lucide-react'
import { useCamera } from '@/hooks/useCamera'
import { useSession } from '@/hooks/useSession'
import { captureFrame } from '@/utils/capture'
import { CameraPreview } from '@/components/booth/CameraPreview'
import { CaptureButton } from '@/components/booth/CaptureButton'
import { PhotoStrip } from '@/components/booth/PhotoStrip'
import { PermissionGate } from '@/components/booth/PermissionGate'
import { UploadProgress } from '@/components/booth/UploadProgress'
import { SessionComplete } from '@/components/booth/SessionComplete'
import {
  COUNTDOWN_SECONDS,
  FRAME_SIZE,
  FRAME_SRC,
  FRAME_WINDOW,
  MAX_PHOTOS_PER_SESSION,
  UNDO_SECONDS,
} from '@/lib/constants'
import type { CapturedPhoto } from '@/types/photobooth'

export function BoothPage() {
  const camera = useCamera()
  const session = useSession()

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [flashActive, setFlashActive] = useState(false)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [removed, setRemoved] = useState<{ photo: CapturedPhoto; index: number } | null>(null)
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
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
        dbId: null,
      }

      session.addPhoto(photo)
    } catch (err) {
      console.error('Capture error:', err)
    }
  }, [camera.status, session])

  // Countdown: tick once per second, then take the photo at 0
  const captureRef = useRef(handleCapture)
  useEffect(() => {
    captureRef.current = handleCapture
  })

  useEffect(() => {
    if (countdown === null) return
    if (countdown === 0) {
      setCountdown(null)
      void captureRef.current()
      return
    }
    const t = setTimeout(() => setCountdown(countdown - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown])

  const startCountdown = useCallback(() => {
    if (countdown !== null || camera.status !== 'active') return
    if (session.photos.length >= MAX_PHOTOS_PER_SESSION) return
    setCountdown(COUNTDOWN_SECONDS)
  }, [countdown, camera.status, session.photos.length])

  // Delete with a short undo window
  const { photos, removePhoto, restorePhoto, discardPhoto } = session

  const finalizeRemoved = useCallback(
    (item: { photo: CapturedPhoto } | null) => {
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current)
      undoTimerRef.current = null
      if (item) discardPhoto(item.photo)
    },
    [discardPhoto]
  )

  const handleDelete = useCallback(
    (localId: string) => {
      const index = photos.findIndex((p) => p.localId === localId)
      const photo = photos[index]
      if (!photo) return

      // A second delete makes the previous one permanent
      finalizeRemoved(removed)
      removePhoto(localId)
      setRemoved({ photo, index })

      undoTimerRef.current = setTimeout(() => {
        discardPhoto(photo)
        setRemoved(null)
        undoTimerRef.current = null
      }, UNDO_SECONDS * 1000)
    },
    [photos, removed, removePhoto, discardPhoto, finalizeRemoved]
  )

  const handleUndo = useCallback(() => {
    if (!removed) return
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current)
    undoTimerRef.current = null
    restorePhoto(removed.photo, removed.index)
    setRemoved(null)
  }, [removed, restorePhoto])

  const handleFinish = useCallback(async () => {
    if (session.photos.length === 0) return
    finalizeRemoved(removed)
    setRemoved(null)
    setUploadError(null)

    try {
      const { galleryUrl: url, qrDataUrl: qr } = await session.finishSession(session.photos)
      setGalleryUrl(url)
      setQrDataUrl(qr)
    } catch {
      setUploadError('Some photos failed to upload. You can retry below.')
    }
  }, [session, removed, finalizeRemoved])

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
    <div className="h-dvh flex flex-col overflow-hidden">
      {/* Header */}
      <header className="glass-dark relative px-5 py-2 flex items-center justify-center border-b border-white/[0.09] min-h-[3.25rem] md:min-h-[3.75rem]">
        <img
          src="/sdc-logo.png"
          alt="SDC – Student Developers Community"
          className="absolute left-4 md:left-5 h-6 md:h-7 w-auto select-none"
          draggable={false}
        />
        <h1 className="ux-bubble-word text-2xl md:text-3xl tracking-wide">SDC Photobooth</h1>
      </header>

      {/* Body */}
      <div className="flex-1 flex flex-col md:flex-row gap-0 overflow-hidden min-h-0">
        {/* Camera area */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          <div className="flex-1 min-h-0 relative">
            {/* Live preview inside the brand frame: the camera sits in the frame's photo
                window and the frame is drawn on top, so it matches the saved photo. */}
            <div
              className="absolute inset-1 flex items-center justify-center"
              style={{ containerType: 'size' }}
            >
              <div
                className="relative"
                style={{
                  aspectRatio: `${FRAME_SIZE.width} / ${FRAME_SIZE.height}`,
                  width: `min(100cqw, calc(100cqh * ${FRAME_SIZE.width / FRAME_SIZE.height}))`,
                }}
              >
                <div
                  className="absolute"
                  style={{
                    left: `${(FRAME_WINDOW.x / FRAME_SIZE.width) * 100}%`,
                    top: `${(FRAME_WINDOW.y / FRAME_SIZE.height) * 100}%`,
                    width: `${(FRAME_WINDOW.width / FRAME_SIZE.width) * 100}%`,
                    height: `${(FRAME_WINDOW.height / FRAME_SIZE.height) * 100}%`,
                  }}
                >
                  {camera.status === 'requesting' ? (
                    <div className="w-full h-full skeleton flex items-center justify-center">
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
                  {countdown !== null && countdown > 0 && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <span
                        key={countdown}
                        className="text-white font-black drop-shadow-[0_4px_24px_rgba(0,0,0,0.6)] animate-pulse"
                        style={{ fontSize: 'clamp(4rem, 12vw, 10rem)', lineHeight: 1 }}
                      >
                        {countdown}
                      </span>
                    </div>
                  )}
                </div>
                <img
                  src={FRAME_SRC}
                  alt=""
                  className="absolute inset-0 w-full h-full pointer-events-none select-none"
                  draggable={false}
                />
              </div>
            </div>
          </div>

          {/* Action bar: count | capture (centered) | finish */}
          <div className="glass-dark border-t border-white/10 px-4 md:px-5 py-2 grid grid-cols-3 items-center">
            <span className="text-xs text-slate-400 justify-self-start">
              {session.photos.length > 0 &&
                `${session.photos.length} photo${session.photos.length !== 1 ? 's' : ''} captured`}
            </span>

            <div className="justify-self-center">
              <CaptureButton
                photoCount={session.photos.length}
                disabled={camera.status !== 'active' || countdown !== null}
                onCapture={startCountdown}
              />
            </div>

            <button
              id="finish-session-btn"
              onClick={() => void handleFinish()}
              disabled={session.photos.length === 0 || countdown !== null}
              className="btn-primary justify-self-end"
            >
              <CheckCircle2 size={16} />
              Finish ({session.photos.length})
            </button>
          </div>
        </div>

        {/* Photo strip sidebar */}
        <aside className="glass-dark border-t md:border-t-0 md:border-l border-white/10 flex flex-col flex-none h-32 md:h-auto w-full md:w-[280px]">
          <div className="hidden md:flex items-baseline justify-between px-4 py-4 border-b border-white/[0.09]">
            <h2 className="ux-section-title text-lg">Photos</h2>
            <span className="text-xs font-semibold text-[#FF8A45]">
              {session.photos.length} / {MAX_PHOTOS_PER_SESSION}
            </span>
          </div>
          <div className="flex-1 min-h-0 overflow-x-auto md:overflow-x-hidden md:overflow-y-auto p-2 md:p-3">
            <PhotoStrip photos={session.photos} onDelete={handleDelete} />
          </div>
        </aside>
      </div>
      {/* Undo toast */}
      {removed && (
        <div className="fixed bottom-28 left-1/2 -translate-x-1/2 z-50 glass-dark rounded-2xl overflow-hidden shadow-card fade-in">
          <div className="flex items-center gap-4 px-5 py-3">
            <span className="text-sm text-slate-200">Photo removed</span>
            <button id="undo-delete-btn" onClick={handleUndo} className="btn-primary !py-1.5 !px-4 !text-sm">
              <RotateCcw size={14} />
              Undo
            </button>
          </div>
          <div className="h-1 bg-white/10">
            <div
              key={removed.photo.localId}
              className="h-full bg-brand-500 undo-bar"
              style={{ animationDuration: `${UNDO_SECONDS}s` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
