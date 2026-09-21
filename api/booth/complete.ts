import { isUuid, json, supabaseAdmin } from '../_lib/supabase-admin.js'

/** POST /api/booth/complete — body: { boothToken, status: 'complete' | 'failed' } */
export async function POST(request: Request): Promise<Response> {
  const body = (await request.json().catch(() => null)) as {
    boothToken?: unknown
    status?: unknown
  } | null

  if (!body || !isUuid(body.boothToken) || (body.status !== 'complete' && body.status !== 'failed')) {
    return json({ error: 'Invalid request' }, 400)
  }

  const { data: session } = await supabaseAdmin
    .from('sessions')
    .select('id, status')
    .eq('booth_token', body.boothToken)
    .maybeSingle()

  if (!session || session.status !== 'uploading') return json({ error: 'Invalid session' }, 403)

  // Trust the database, not the client, for the photo count.
  const { count } = await supabaseAdmin
    .from('photos')
    .select('id', { count: 'exact', head: true })
    .eq('session_id', session.id)

  const photoCount = count ?? 0
  const status = body.status === 'complete' && photoCount > 0 ? 'complete' : 'failed'

  const { error } = await supabaseAdmin
    .from('sessions')
    .update({ status, completed_at: new Date().toISOString(), photo_count: photoCount })
    .eq('id', session.id)

  if (error) return json({ error: 'Could not update session' }, 500)
  return json({ status, photoCount })
}
