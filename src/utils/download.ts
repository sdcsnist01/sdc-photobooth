import type { GalleryPhoto } from '@/types/photobooth'

/**
 * Downloads a single photo. The signed URL is on Supabase's domain, and
 * browsers ignore <a download> for cross-origin links — they just open the
 * file instead of saving it. So the file is fetched first and saved from a
 * same-origin blob: URL, which browsers always honor.
 */
export async function downloadSinglePhoto(signedUrl: string, filename: string): Promise<void> {
  const response = await fetch(signedUrl)
  if (!response.ok) throw new Error(`Could not fetch ${filename} (${response.status})`)
  const blob = await response.blob()
  const blobUrl = URL.createObjectURL(blob)

  const a = document.createElement('a')
  a.href = blobUrl
  a.download = filename
  a.rel = 'noopener noreferrer'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(blobUrl)
}

/**
 * Downloads every photo as its own separate image file (no ZIP/folder).
 * Browsers block a burst of simultaneous downloads, so each one is
 * triggered a beat after the last — the browser may still ask the visitor
 * to allow "multiple downloads" once, up front.
 *
 * @param photos     Array of gallery photos (needs signedUrl + filename)
 * @param onProgress Optional callback 0–100
 */
export async function downloadAllPhotos(
  photos: GalleryPhoto[],
  onProgress?: (pct: number) => void
): Promise<void> {
  const total = photos.length
  if (total === 0) return

  for (const [index, photo] of photos.entries()) {
    await downloadSinglePhoto(photo.signedUrl, photo.filename)
    onProgress?.(Math.round(((index + 1) / total) * 100))
    if (index < total - 1) await sleep(350)
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
