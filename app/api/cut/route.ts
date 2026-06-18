// Forwards cut requests to the Railway microservice (clipforge-cutter).
// Required env vars: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
export const dynamic = 'force-dynamic'

import { type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/security/rate-limit'
import { secureJson, secureError } from '@/lib/security/headers'
import { isHttpUrl } from '@/lib/security/validators'

// The cutter base URL is configurable via env (no trailing slash); falls back
// to the production Railway service when unset so existing deploys are unaffected.
const CUTTER_URL =
  process.env.CUTTER_URL?.replace(/\/$/, '') || 'https://clipforge-cutter-production.up.railway.app'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    // Rate limit: 20 cut requests per minute per IP
    const limit = await rateLimit(request, 'cut', 20, 60)
    if (!limit.success) {
      console.warn('[rate-limit] hit on /api/cut')
      return secureError('Too many requests, please slow down', 429, undefined, {
        'Retry-After': String(limit.retryAfter),
      })
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return secureError('Invalid JSON body', 400)
    }

    if (!body || typeof body !== 'object') {
      return secureError('Invalid request body', 400)
    }

    const { videoId, startTime, endTime } = body as {
      videoId?: unknown
      startTime?: unknown
      endTime?: unknown
    }

    if (typeof videoId !== 'string' || videoId.length === 0) {
      return secureError('videoId is required', 400)
    }
    if (typeof startTime !== 'number' || typeof endTime !== 'number') {
      return secureError('startTime and endTime must be numbers', 400)
    }

    // Look up the source video URL from Supabase
    const supabase = await createClient()

    const { data: userData } = await supabase.auth.getUser()
    const user = userData?.user
    if (!user) {
      return secureError('Unauthorized', 401)
    }

    const { data: video, error: videoError } = await supabase
      .from('videos')
      .select('id, file_url, cloudinary_public_id')
      .eq('id', videoId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (videoError) {
      console.error('[cut] supabase error:', videoError)
      return secureError('Failed to fetch video', 500, videoError)
    }
    if (!video?.file_url) {
      return secureError('Video not found', 400)
    }

    // `file_url` is a Cloudinary "fetch" delivery URL wrapping the original
    // Uploadthing URL. Cloudinary's fetch delivery isn't enabled for this
    // account, so downloading it directly returns HTTP 401. `cloudinary_public_id`
    // holds the raw, directly-downloadable Uploadthing URL - prefer that when
    // it's a real URL, and fall back to `file_url` for older rows that don't
    // have it.
    const sourceUrl = isHttpUrl(video.cloudinary_public_id)
      ? video.cloudinary_public_id
      : video.file_url

    // Forward to Railway microservice with 60s AbortController timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 60000)

    let cutRes: Response
    try {
      cutRes = await fetch(`${CUTTER_URL}/cut`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileUrl: sourceUrl, startTime, endTime }),
        signal: controller.signal,
      })
    } catch (fetchErr: unknown) {
      clearTimeout(timeoutId)
      if (fetchErr instanceof Error && fetchErr.name === 'AbortError') {
        return secureError(
          'Cut timed out — video may be too long or Railway is under load',
          504
        )
      }
      throw fetchErr
    }
    clearTimeout(timeoutId)

    let cutJson: Record<string, unknown> = {}
    try {
      cutJson = await cutRes.json()
    } catch {
      cutJson = {}
    }

    if (!cutRes.ok) {
      console.error('[cut] cutter service error:', cutJson)
      const errMsg =
        (cutJson?.error as string) ||
        (cutJson?.message as string) ||
        `Cut service failed (${cutRes.status})`
      return secureError(errMsg, 500)
    }

    const clipUrl: string = cutJson.clip_url as string
    if (!clipUrl) {
      return secureError('Cut service returned no clip_url', 500)
    }

    // Update the clips row with the new clip_url — filter by all three fields
    // to avoid updating every clip for this video
    const { error: updateError } = await supabase
      .from('clips')
      .update({ clip_url: clipUrl })
      .eq('video_id', videoId)
      .eq('start_time', startTime)
      .eq('end_time', endTime)

    if (updateError) {
      console.error('[cut] failed to update clip_url:', updateError)
      return secureError('Failed to save clip URL', 500, updateError)
    }

    return secureJson({ clip_url: clipUrl })
  } catch (err) {
    console.error('[cut] unhandled error:', err)
    return secureError('Internal server error', 500, err)
  }
}
