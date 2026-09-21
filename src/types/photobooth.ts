// Application-level types for the photobooth

export type { SessionStatus, DbSession, DbPhoto } from './database'

// ─── Camera ───────────────────────────────────────────────────────────────────

export type CameraStatus =
  | 'idle'
  | 'requesting'
  | 'active'
  | 'denied'
  | 'unavailable'
  | 'disconnected'

export interface CameraState {
  status: CameraStatus
  error: string | null
  stream: MediaStream | null
  facingMode: 'user' | 'environment'
}

// ─── Photo (local, before upload) ────────────────────────────────────────────

export interface CapturedPhoto {
  /** Local-only UUID assigned at capture time (used as idempotent upload filename) */
  localId: string
  /** Object URL for thumbnail preview (revoke after use) */
  previewUrl: string
  /** The actual image blob to upload */
  blob: Blob
  mimeType: 'image/webp' | 'image/jpeg'
  width: number
  height: number
  captureOrder: number
  uploadStatus: PhotoUploadStatus
  uploadProgress: number // 0–100
  /** DB photo id after successful insert */
  dbId: string | null
}

export type PhotoUploadStatus = 'pending' | 'uploading' | 'success' | 'failed'

// ─── Session (local state) ────────────────────────────────────────────────────

export type BoothStep =
  | 'permission'    // waiting for camera permission
  | 'capture'       // live preview + capturing
  | 'uploading'     // uploading in progress
  | 'complete'      // QR shown
  | 'error'         // session-level failure

export interface BoothSessionState {
  step: BoothStep
  /** Write credential for /api/booth/* (never in the QR) */
  boothToken: string | null
  /** Token used in the gallery URL */
  secureToken: string | null
  photos: CapturedPhoto[]
  overallError: string | null
}

// ─── Gallery ──────────────────────────────────────────────────────────────────

export interface GalleryPhoto {
  id: string
  filename: string
  captureOrder: number
  width: number | null
  height: number | null
  mimeType: string
  /** Signed URL valid for 1 hour */
  signedUrl: string
}

export interface GallerySession {
  createdAt: string
  photoCount: number
  photos: GalleryPhoto[]
}

export type GalleryStatus =
  | 'loading'
  | 'loaded'
  | 'invalid'      // token not found
  | 'still_uploading'
  | 'failed'
  | 'error'        // network / unexpected error
