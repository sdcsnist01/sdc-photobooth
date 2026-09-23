/** Supabase Storage bucket name */
export const STORAGE_BUCKET = 'photos'

/** Gallery URL base path (no trailing slash) */
export const GALLERY_BASE_PATH = '/gallery'

/** Max photos allowed per session (soft UI limit) */
export const MAX_PHOTOS_PER_SESSION = 10

/** WebP quality for canvas capture (0.0 – 1.0) */
export const IMAGE_QUALITY = 0.85

/** JPEG fallback quality (used if WebP encoding not supported) */
export const JPEG_FALLBACK_QUALITY = 0.90

/** Max canvas width in pixels before downscaling */
export const MAX_CAPTURE_WIDTH = 1920

/** Signed URL expiry in seconds (1 hour) */
export const SIGNED_URL_EXPIRY = 3600

/** Upload max retry attempts per photo */
export const UPLOAD_MAX_RETRIES = 3

/** Initial upload retry delay in ms (exponential backoff) */
export const UPLOAD_RETRY_BASE_DELAY_MS = 1000

/** Milliseconds to debounce the capture button */
export const CAPTURE_DEBOUNCE_MS = 500

/** Seconds counted down before each photo is taken */
export const COUNTDOWN_SECONDS = 3

/** Seconds a deleted photo can be restored with Undo */
export const UNDO_SECONDS = 5

/** Brand frame composited onto every photo (public/frame.png, transparent photo window) */
export const FRAME_SRC = '/frame.png'

/** frame.png dimensions in pixels */
export const FRAME_SIZE = { width: 1888, height: 1884 } as const

/** Photo window inside frame.png, in the frame's own pixels */
export const FRAME_WINDOW = { x: 144, y: 538, width: 1601, height: 991 } as const
