import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import type { GalleryPhoto } from '@/types/photobooth'

/**
 * Downloads a single photo by triggering an <a download> click.
 * Uses the signed URL directly.
 */
export function downloadSinglePhoto(signedUrl: string, filename: string): void {
  const a = document.createElement('a')
  a.href = signedUrl
  a.download = filename
  a.rel = 'noopener noreferrer'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

/**
 * Downloads all photos as a ZIP file.
 * Fetches each photo via its signed URL, zips them, and triggers a save.
 *
 * @param photos     Array of gallery photos (needs signedUrl + filename)
 * @param tokenSlug  First 8 chars of the session token (for the ZIP filename)
 * @param onProgress Optional callback 0–100
 */
export async function downloadAllPhotos(
  photos: GalleryPhoto[],
  tokenSlug: string,
  onProgress?: (pct: number) => void
): Promise<void> {
  if (photos.length === 0) return

  const zip = new JSZip()
  const folder = zip.folder('uxplosion-photos')
  if (!folder) throw new Error('Failed to create ZIP folder')

  const total = photos.length

  await Promise.all(
    photos.map(async (photo, index) => {
      const response = await fetch(photo.signedUrl)
      if (!response.ok) {
        throw new Error(`Failed to fetch photo ${photo.filename}: ${response.statusText}`)
      }
      const blob = await response.blob()
      folder.file(photo.filename, blob)
      onProgress?.(Math.round(((index + 1) / total) * 90))
    })
  )

  onProgress?.(95)
  const content = await zip.generateAsync({ type: 'blob' })
  onProgress?.(100)

  saveAs(content, `uxplosion-photobooth-${tokenSlug}.zip`)
}
