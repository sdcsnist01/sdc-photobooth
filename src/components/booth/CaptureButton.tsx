import { Camera } from 'lucide-react'
import { CAPTURE_DEBOUNCE_MS, MAX_PHOTOS_PER_SESSION } from '@/lib/constants'
import { useRef } from 'react'

interface Props {
  photoCount: number
  disabled?: boolean
  onCapture: () => void
}

export function CaptureButton({ photoCount, disabled = false, onCapture }: Props) {
  const lastClickRef = useRef<number>(0)
  const atLimit = photoCount >= MAX_PHOTOS_PER_SESSION

  const handleClick = () => {
    const now = Date.now()
    if (now - lastClickRef.current < CAPTURE_DEBOUNCE_MS) return
    lastClickRef.current = now
    onCapture()
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        id="capture-btn"
        onClick={handleClick}
        disabled={disabled || atLimit}
        className="btn-shutter"
        aria-label="Take photo"
        title={atLimit ? `Maximum ${MAX_PHOTOS_PER_SESSION} photos per session` : 'Take photo'}
      >
        <Camera size={26} className="text-[#0A0A0C]" />
      </button>
      <span className="text-xs text-slate-400">
        {atLimit
          ? `Max ${MAX_PHOTOS_PER_SESSION} photos`
          : photoCount > 0
          ? `${photoCount} / ${MAX_PHOTOS_PER_SESSION}`
          : 'Tap to capture'}
      </span>
    </div>
  )
}
