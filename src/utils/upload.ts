import { supabase } from '@/lib/supabase'
import {
  STORAGE_BUCKET,
  UPLOAD_MAX_RETRIES,
  UPLOAD_RETRY_BASE_DELAY_MS,
} from '@/lib/constants'

export interface UploadResult {
  storagePath: string
}

/**
 * Uploads a photo blob to Supabase Storage with exponential-backoff retry.
 * The path is deterministic (based on sessionId + localId), making retries idempotent.
 *
 * @param sessionId  Internal DB session UUID (used for storage folder)
 * @param localId    UUID assigned to this photo at capture time (idempotent key)
 * @param blob       The image blob
 * @param mimeType   'image/webp' or 'image/jpeg'
 * @param onProgress Optional callback receiving 0–100 progress estimate
 */
export async function uploadPhoto(
  sessionId: string,
  localId: string,
  blob: Blob,
  mimeType: 'image/webp' | 'image/jpeg',
  onProgress?: (pct: number) => void
): Promise<UploadResult> {
  const ext = mimeType === 'image/webp' ? 'webp' : 'jpg'
  const storagePath = `${sessionId}/${localId}.${ext}`

  let lastError: Error | null = null

  for (let attempt = 0; attempt < UPLOAD_MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      const delay = UPLOAD_RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1)
      await sleep(delay)
    }

    try {
      onProgress?.(attempt === 0 ? 10 : 20 + attempt * 20)

      const { error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(storagePath, blob, {
          contentType: mimeType,
          upsert: true, // idempotent: overwrite if same path already exists from a retry
        })

      if (error) throw new Error(error.message)

      onProgress?.(100)
      return { storagePath }
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
      console.warn(`Upload attempt ${attempt + 1}/${UPLOAD_MAX_RETRIES} failed:`, lastError.message)
    }
  }

  throw new Error(
    `Upload failed after ${UPLOAD_MAX_RETRIES} attempts: ${lastError?.message ?? 'Unknown error'}`
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
