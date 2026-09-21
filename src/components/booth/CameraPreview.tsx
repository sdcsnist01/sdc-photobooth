import { useEffect, useRef, useState } from 'react'
import { FlipHorizontal } from 'lucide-react'

interface Props {
  stream: MediaStream | null
  onFlip?: () => void
  showFlip?: boolean
  flashActive?: boolean
}

export function CameraPreview({ stream, onFlip, showFlip = false, flashActive = false }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [videoReady, setVideoReady] = useState(false)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    if (stream) {
      video.srcObject = stream
      setVideoReady(false)
      void video.play().catch(console.warn)
    } else {
      video.srcObject = null
      setVideoReady(false)
    }
  }, [stream])

  return (
    <div className="relative w-full h-full bg-black overflow-hidden">
      {/* Video element */}
      <video
        ref={videoRef}
        id="camera-video"
        autoPlay
        playsInline
        muted
        onCanPlay={() => setVideoReady(true)}
        className={`w-full h-full object-cover transition-opacity duration-500 ${videoReady ? 'opacity-100' : 'opacity-0'}`}
        style={{ transform: 'scaleX(-1)' }} /* Mirror for selfie experience */
      />

      {/* Loading shimmer while video initialises */}
      {!videoReady && (
        <div className="absolute inset-0 skeleton" />
      )}

      {/* Camera flash overlay */}
      {flashActive && (
        <div className="absolute inset-0 bg-white camera-flash pointer-events-none" />
      )}

      {/* Flip camera button */}
      {showFlip && onFlip && (
        <button
          id="flip-camera-btn"
          onClick={onFlip}
          className="absolute top-3 right-3 glass rounded-full p-2 text-white hover:bg-white/20 transition-all"
          title="Flip camera"
        >
          <FlipHorizontal size={20} />
        </button>
      )}

      {/* Subtle corner frame overlay */}
      <div className="absolute inset-0 pointer-events-none" style={{
        boxShadow: 'inset 0 0 60px rgba(0,0,0,0.4)',
      }} />
    </div>
  )
}
