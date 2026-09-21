import {
  MAX_PHOTOS_PER_SESSION,
  MAX_UPLOAD_BYTES,
  STORAGE_BUCKET,
  isUuid,
  json,
  supabaseAdmin,
} from '../_lib/supabase-admin.js'

const EXT = { 'image/webp': 'webp', 'image/jpeg': 'jpg' } as const

const toInt = (v: FormDataEntryValue | null) => {
  const n = Number(v)
  return Number.isInteger(n) && n >= 0 ? n : null
}

/** POST /api/booth/upload — multipart: boothToken, localId, mimeType, captureOrder, width, height, file */
export async function POST(request: Request): Promise<Response> {
  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return json({ error: 'Invalid form data' }, 400)
  }

  const boothToken = form.get('boothToken')
  const localId = form.get('localId')
  const mimeType = form.get('mimeType')
  const captureOrder = toInt(form.get('captureOrder'))
  const file = form.get('file')

  if (
    !isUuid(boothToken) ||
    !isUuid(localId) ||
    (mimeType !== 'image/webp' && mimeType !== 'image/jpeg') ||
    captureOrder === null ||
    captureOrder >= MAX_PHOTOS_PER_SESSION ||
    !(file instanceof Blob) ||
    file.size === 0 ||
    file.size > MAX_UPLOAD_BYTES
  ) {
    return json({ error: 'Invalid upload' }, 400)
  }

  const { data: session } = await supabaseAdmin
    .from('sessions')
    .select('id, status')
    .eq('booth_token', boothToken)
    .maybeSingle()

  if (!session || session.status !== 'uploading') return json({ error: 'Invalid session' }, 403)

  const ext = EXT[mimeType]
  const storagePath = `${session.id}/${localId}.${ext}`

  const { error: uploadError } = await supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, file, { contentType: mimeType, upsert: true })
  if (uploadError) return json({ error: 'Storage upload failed' }, 500)

  const { data: photo, error: dbError } = await supabaseAdmin
    .from('photos')
    .upsert(
      {
        session_id: session.id,
        storage_path: storagePath,
        filename: `photo-${String(captureOrder + 1).padStart(2, '0')}.${ext}`,
        file_size: file.size,
        width: toInt(form.get('width')),
        height: toInt(form.get('height')),
        mime_type: mimeType,
        capture_order: captureOrder,
      },
      { onConflict: 'session_id,storage_path' }
    )
    .select('id')
    .single()

  if (dbError || !photo) return json({ error: 'Could not save photo' }, 500)
  return json({ photoId: photo.id })
}
