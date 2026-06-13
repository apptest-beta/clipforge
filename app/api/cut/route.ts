// Forwards cut requests to the Railway microservice (clipforge-cutter).
// Required env vars: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
export const dynamic = 'force-dynamic'

import { type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/security/rate-limit'
import { secureJson, secureError } from '@/lib/security/headers'

const CUTTER_URL = 'https://clipforge-cutter-production.up.railway.app'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  console.log('[cut] route hit')
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

    const { data: video, error: videoError } = await supabase
      .from('videos')
      .select('id, file_url')
      .eq('id', videoId)
      .maybeSingle()

    if (videoError) {
      console.error('[cut] supabase error:', videoError)
      return secureError('Failed to fetch video', 500, videoError)
    }
    if (!video?.file_url) {
      return secureError('Video not found', 400)
    }

    console.log('[cut] videoId:', videoId, 'start:', startTime, 'end:', endTime)
    console.log('[cut] forwarding to cutter service:', video.file_url)

    // Forward to Railway microservice with 60s AbortController timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 60000)

    let cutRes: Response
    try {
      cutRes = await fetch(`${CUTTER_URL}/cut`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileUrl: video.file_url, startTime, endTime }),
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
