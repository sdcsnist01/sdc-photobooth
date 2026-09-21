import { UPLOAD_MAX_RETRIES, UPLOAD_RETRY_BASE_DELAY_MS } from '@/lib/constants'

export interface UploadInput {
  boothToken: string
  localId: string
  blob: Blob
  mimeType: 'image/webp' | 'image/jpeg'
  captureOrder: number
  width: number
  height: number
}

/**
 * Uploads one photo through /api/booth/upload with exponential-backoff retry.
 * Retries are idempotent: the server derives the storage path from localId.
 */
export async function uploadPhoto(
  input: UploadInput,
  onProgress?: (pct: number) => void
): Promise<{ photoId: string }> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt < UPLOAD_MAX_RETRIES; attempt++) {
    if (attempt > 0) await sleep(UPLOAD_RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1))

    try {
      onProgress?.(attempt === 0 ? 10 : 20 + attempt * 20)

      const form = new FormData()
      form.append('boothToken', input.boothToken)
      form.append('localId', input.localId)
      form.append('mimeType', input.mimeType)
      form.append('captureOrder', String(input.captureOrder))
      form.append('width', String(input.width))
      form.append('height', String(input.height))
      form.append('file', input.blob)

      const res = await fetch('/api/booth/upload', { method: 'POST', body: form })
      if (!res.ok) throw new Error(`Upload failed (${res.status})`)

      const { photoId } = (await res.json()) as { photoId: string }
      onProgress?.(100)
      return { photoId }
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
      console.warn(`Upload attempt ${attempt + 1}/${UPLOAD_MAX_RETRIES} failed:`, lastError.message)
    }
  }

  throw new Error(
    `Upload failed after ${UPLOAD_MAX_RETRIES} attempts: ${lastError?.message ?? 'Unknown error'}`
  )
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
