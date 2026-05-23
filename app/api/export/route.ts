// Required env vars:
//   NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
//   CLOUDINARY_CLOUD_NAME (used as the SSRF allow-list prefix)
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/security/rate-limit'
import { secureError, withSecurityHeaders, applySecurityHeaders } from '@/lib/security/headers'
import { isUuid, isOwnCloudinaryUrl } from '@/lib/security/validators'
import { requireEnv } from '@/lib/security/env'

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || 'dffygtstq'

export const runtime = 'nodejs'

function sanitizeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9_\-]/g, '_').slice(0, 80) || 'clip'
}

// Rate limit: 20 exports per minute per IP. Each export streams a Cloudinary
// file - bandwidth-heavy but cheap on compute, so the cap is generous.
export async function GET(request: NextRequest) {
  const limit = await rateLimit(request, 'export', 20, 60)
  if (!limit.success) {
    return secureError('Too many requests, please slow down', 429, undefined, {
      'Retry-After': String(limit.retryAfter),
    })
  }

  try {
    requireEnv(['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'])
  } catch (err) {
    return secureError('Server misconfigured', 500, err)
  }

  try {
    const clipId = request.nextUrl.searchParams.get('clip_id')
    if (!clipId || !isUuid(clipId)) {
      return secureError('clip_id must be a valid UUID', 400)
    }

    // Auth check (preserved from prior hardening).
    const supabase = await createClient()
    const { data: userData } = await supabase.auth.getUser()
    const user = userData?.user
    if (!user) {
      return secureError('Not authenticated', 401)
    }

    // Fetch clip + owner via inner join so we can verify ownership.
    const { data: clip, error } = await supabase
      .from('clips')
      .select(
        'id, clip_url, moment_type, start_time, end_time, video_id, videos!inner(user_id)'
      )
      .eq('id', clipId)
      .single()

    if (error || !clip) {
      return secureError('Clip not found', 404, error)
    }

    const parent = Array.isArray((clip as any).videos)
      ? (clip as any).videos[0]
      : (clip as any).videos
    const ownerId: string | undefined = parent?.user_id

    if (!ownerId || ownerId !== user.id) {
      return secureError('You do not have access to this clip', 403)
    }

    if (!clip.clip_url) {
      return secureError('Clip has not been cut yet', 400)
    }

    // SSRF guard: the clip_url must point at our specific Cloudinary account
    // before we issue an outbound fetch. Without this, a compromised row in
    // the clips table could redirect this endpoint to fetch arbitrary hosts.
    if (!isOwnCloudinaryUrl(clip.clip_url, CLOUD_NAME)) {
      return secureError('Clip URL is not allowed', 400, `Rejected url: ${clip.clip_url}`)
    }

    const upstream = await fetch(clip.clip_url)
    if (!upstream.ok || !upstream.body) {
      return secureError('Upstream fetch failed', 502, `status=${upstream.status}`)
    }

    const label = sanitizeFilename(`${clip.moment_type || 'clip'}_${clip.id}`)
    const filename = `${label}.mp4`

    const headers = new Headers()
    headers.set('Content-Type', upstream.headers.get('content-type') || 'video/mp4')
    headers.set('Content-Disposition', `attachment; filename="${filename}"`)
    const len = upstream.headers.get('content-length')
    if (len) headers.set('Content-Length', len)
    headers.set('Cache-Control', 'no-store')
    applySecurityHeaders(headers)

    return withSecurityHeaders(new Response(upstream.body, { status: 200, headers }))
  } catch (err) {
    return secureError('Export failed', 500, err)
  }
}
