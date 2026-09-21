import {
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

/**
 * Captures the current video frame onto a canvas, optionally composites
 * a branded frame overlay, then exports as WebP (or JPEG fallback).
 *
 * @param videoEl   The live <video> element
 * @param overlayEl Optional pre-loaded <img> element for the brand frame
 */
export async function captureFrame(
  videoEl: HTMLVideoElement,
  overlayEl?: HTMLImageElement | null
): Promise<CaptureResult> {
  const srcWidth = videoEl.videoWidth
  const srcHeight = videoEl.videoHeight

  if (!srcWidth || !srcHeight) {
    throw new Error('Video dimensions not available. Is the camera stream active?')
  }

  // Downscale if wider than MAX_CAPTURE_WIDTH, preserving aspect ratio
  const scale = srcWidth > MAX_CAPTURE_WIDTH ? MAX_CAPTURE_WIDTH / srcWidth : 1
  const canvasWidth = Math.round(srcWidth * scale)
  const canvasHeight = Math.round(srcHeight * scale)

  // Reuse a single module-level canvas to avoid memory leaks
  const canvas = getSharedCanvas()
  canvas.width = canvasWidth
  canvas.height = canvasHeight

  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Could not get 2D canvas context')

  // 1. Draw the video frame
  ctx.drawImage(videoEl, 0, 0, canvasWidth, canvasHeight)

  // 2. Composite the optional brand overlay (covers full canvas)
  if (overlayEl) {
    ctx.drawImage(overlayEl, 0, 0, canvasWidth, canvasHeight)
  }

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
