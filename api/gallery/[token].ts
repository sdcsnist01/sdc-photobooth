import {
  SIGNED_URL_EXPIRY,
  STORAGE_BUCKET,
  isUuid,
  json,
  supabaseAdmin,
} from '../_lib/supabase-admin.js'

/** GET /api/gallery/:token — token is the secure_token from the QR code. */
export async function GET(request: Request): Promise<Response> {
  const token = new URL(request.url).pathname.split('/').filter(Boolean).pop()
  if (!isUuid(token)) return json({ status: 'invalid' }, 404)

  const { data: session } = await supabaseAdmin
    .from('sessions')
    .select('id, status, photo_count, created_at')
    .eq('secure_token', token)
    .maybeSingle()

  if (!session) return json({ status: 'invalid' }, 404)
  if (session.status !== 'complete') return json({ status: session.status })

  const { data: rows, error } = await supabaseAdmin
    .from('photos')
    .select('id, storage_path, filename, capture_order, width, height, mime_type')
    .eq('session_id', session.id)
    .order('capture_order', { ascending: true })

  if (error) return json({ error: 'Could not load photos' }, 500)

  const { data: signed, error: signError } = await supabaseAdmin.storage
    .from(STORAGE_BUCKET)
    .createSignedUrls(
      (rows ?? []).map((r) => r.storage_path),
      SIGNED_URL_EXPIRY
    )
  if (signError || !signed) return json({ error: 'Could not sign URLs' }, 500)

  const urlByPath = new Map(signed.map((s) => [s.path, s.signedUrl]))

  // storage_path and the internal session id are never returned.
  const photos = (rows ?? []).flatMap((r) => {
    const signedUrl = urlByPath.get(r.storage_path)
    return signedUrl
      ? [
          {
            id: r.id,
            filename: r.filename,
            captureOrder: r.capture_order,
            width: r.width,
            height: r.height,
            mimeType: r.mime_type,
            signedUrl,
          },
        ]
      : []
  })

  return json({
    status: 'loaded',
    session: { createdAt: session.created_at, photoCount: session.photo_count },
    photos,
  })
}
