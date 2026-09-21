import {
  FRAME_SRC,
  FRAME_WINDOW,
  IMAGE_QUALITY,
  JPEG_FALLBACK_QUALITY,
  MAX_CAPTURE_WIDTH,
} from '@/lib/constants'

/** Check at startup whether the browser can encode WebP via Canvas */
function supportsWebPEncoding(): boolean {
  try {
    const canvas = document.createElement('canvas')
    canvas.width = 1
    canvas.height = 1
    return canvas.toDataURL('image/webp').startsWith('data:image/webp')
  } catch {
    return false
  }
}

const CAN_ENCODE_WEBP = supportsWebPEncoding()

export type CaptureResult = {
  blob: Blob
  mimeType: 'image/webp' | 'image/jpeg'
  width: number
  height: number
}

/** Loaded once; resolves to null if the frame can't be loaded (photos are then saved unframed). */
const framePromise: Promise<HTMLImageElement | null> =
  typeof Image === 'undefined'
    ? Promise.resolve(null)
    : new Promise((resolve) => {
        const img = new Image()
        img.onload = () => resolve(img)
        img.onerror = () => resolve(null)
        img.src = FRAME_SRC
      })

/**
 * Captures the current video frame, fits it (cover) into the brand frame's
 * photo window, draws the frame on top, then exports as WebP (or JPEG fallback).
 */
export async function captureFrame(videoEl: HTMLVideoElement): Promise<CaptureResult> {
  const srcWidth = videoEl.videoWidth
  const srcHeight = videoEl.videoHeight

  if (!srcWidth || !srcHeight) {
    throw new Error('Video dimensions not available. Is the camera stream active?')
  }

  const frame = await framePromise

  // Framed: canvas is the frame's size. Unframed fallback: the raw video size.
  let canvasWidth: number
  let canvasHeight: number
  let target: { x: number; y: number; width: number; height: number }

  if (frame) {
    canvasWidth = frame.naturalWidth
    canvasHeight = frame.naturalHeight
    target = FRAME_WINDOW
  } else {
    const scale = srcWidth > MAX_CAPTURE_WIDTH ? MAX_CAPTURE_WIDTH / srcWidth : 1
    canvasWidth = Math.round(srcWidth * scale)
    canvasHeight = Math.round(srcHeight * scale)
    target = { x: 0, y: 0, width: canvasWidth, height: canvasHeight }
  }

  // Reuse a single module-level canvas to avoid memory leaks
  const canvas = getSharedCanvas()
  canvas.width = canvasWidth
  canvas.height = canvasHeight

  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not get 2D canvas context')

  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, canvasWidth, canvasHeight)

  // 1. Video frame, cropped to fill the window ("cover")
  const windowRatio = target.width / target.height
  let sw = srcWidth
  let sh = srcHeight
  if (srcWidth / srcHeight > windowRatio) sw = srcHeight * windowRatio
  else sh = srcWidth / windowRatio
  const sx = (srcWidth - sw) / 2
  const sy = (srcHeight - sh) / 2
  ctx.drawImage(videoEl, sx, sy, sw, sh, target.x, target.y, target.width, target.height)

  // 2. Brand frame on top (its photo window is transparent)
  if (frame) ctx.drawImage(frame, 0, 0)

  // 3. Export as blob
  const mimeType = CAN_ENCODE_WEBP ? 'image/webp' : 'image/jpeg'
  const quality = CAN_ENCODE_WEBP ? IMAGE_QUALITY : JPEG_FALLBACK_QUALITY

  const blob = await canvasToBlob(canvas, mimeType, quality)

  return { blob, mimeType, width: canvasWidth, height: canvasHeight }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

let _sharedCanvas: HTMLCanvasElement | null = null

function getSharedCanvas(): HTMLCanvasElement {
  if (!_sharedCanvas) {
    _sharedCanvas = document.createElement('canvas')
  }
  return _sharedCanvas
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error('canvas.toBlob returned null'))
      },
      type,
      quality
    )
  })
}
