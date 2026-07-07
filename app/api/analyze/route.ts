// Dispatches AI analysis to the cutter service (Railway), which downloads the
// video, uploads it to Gemini's Files API, runs real video inference, renders
// thumbnails, and writes the resulting clips to Supabase in the background.
// This route just validates, creates the `videos` row (status: processing),
// and hands off — Vercel serverless limits can't fit multi-GB video inference.
//
// Required env vars:
//   NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, CUTTER_SECRET
export const dynamic = 'force-dynamic'

import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/security/rate-limit'
import { secureJson, secureError } from '@/lib/security/headers'
import { isPositiveNumber, hasOnlyKeys } from '@/lib/security/validators'
import { requireEnv } from '@/lib/security/env'

const MAX_DURATION_SEC = 7200 // 2 hours

const CUTTER_URL =
  process.env.CUTTER_URL?.replace(/\/$/, '') || 'https://clipforge-cutter-production.up.railway.app'

export const runtime = 'nodejs'

// Validate an Uploadthing file URL (ufs.sh or utfs.io CDN domains)
function isUploadthingUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false
  try {
    const u = new URL(value)
    return (
      u.protocol === 'https:' &&
      (u.hostname.endsWith('.ufs.sh') ||
        u.hostname.endsWith('.utfs.io') ||
        u.hostname === 'utfs.io' ||
        u.hostname === 'ufs.sh')
    )
  } catch {
    return false
  }
}

function titleFromFileName(name: string | null | undefined): string {
  if (!name) return 'Recording'
  const base = name.replace(/^.*[\\/]/, '').replace(/\.[a-z0-9]+$/i, '')
  return base.trim() || 'Recording'
}

// Allowed top-level keys on the incoming JSON body. Anything else is rejected.
const ALLOWED_KEYS = ['game', 'momentTypes', 'fileName', 'fileUrl', 'durationSec'] as const

// Rate limit: 10 analyze calls per minute per IP. Each call starts a Gemini
// video-inference job on the cutter, so the limit stays tight.
export async function POST(request: NextRequest) {
  const limit = await rateLimit(request, 'analyze', 10, 60)
  if (!limit.success) {
    console.warn('[rate-limit] hit on /api/analyze')
    return secureError('Too many requests, please slow down', 429, undefined, {
      'Retry-After': String(limit.retryAfter),
    })
  }

  try {
    requireEnv(['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'CUTTER_SECRET'])
  } catch (err) {
    console.error('[analyze] missing env vars:', err)
    return secureError('Server misconfigured', 500, err)
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
  if (!hasOnlyKeys(body, ALLOWED_KEYS)) {
    return secureError('Unexpected fields in request body', 400)
  }

  const { game, momentTypes, fileName, fileUrl, durationSec } = body as {
    game?: unknown
    momentTypes?: unknown
    fileName?: unknown
    fileUrl?: unknown
    durationSec?: unknown
  }

  // Early check: fileUrl and game are required
  if (!fileUrl || !game) {
    return secureError('fileUrl and game are required', 400)
  }

  // Validate the Uploadthing delivery URL. Must be HTTPS on a ufs.sh / utfs.io CDN domain.
  if (!isUploadthingUrl(fileUrl)) {
    return secureError('Invalid or missing fileUrl', 400)
  }

  // durationSec is optional but if present must be a positive number under 2h.
  if (durationSec !== undefined && durationSec !== null) {
    if (!isPositiveNumber(durationSec) || (durationSec as number) > MAX_DURATION_SEC) {
      return secureError(
        `durationSec must be a positive number under ${MAX_DURATION_SEC} seconds`,
        400
      )
    }
  }

  if (typeof game !== 'string' || game.length === 0 || game.length > 64) {
    return secureError('Invalid game', 400)
  }
  if (fileName !== undefined && fileName !== null && (typeof fileName !== 'string' || fileName.length > 512)) {
    return secureError('Invalid fileName', 400)
  }
  if (momentTypes !== undefined && !Array.isArray(momentTypes)) {
    return secureError('Invalid momentTypes', 400)
  }

  try {
    const supabase = await createClient()
    const { data: userData } = await supabase.auth.getUser()
    const userId = userData?.user?.id ?? null
    if (!userId) {
      return secureError('Unauthorized', 401)
    }

    // Create the video row up front in "processing" so the dashboard can show
    // it immediately; the cutter flips it to "ready" when analysis completes.
    // The raw Uploadthing URL is stored in both columns — it's the only
    // directly-playable source (see the pickVideoSrc helpers client-side).
    const { data: video, error: videoError } = await supabase
      .from('videos')
      .insert({
        file_name: (fileName as string) || 'upload',
        title: titleFromFileName(fileName as string | null | undefined),
        file_url: fileUrl as string,
        game,
        status: 'processing',
        user_id: userId,
        cloudinary_public_id: fileUrl as string,
      })
      .select()
      .single()

    if (videoError || !video) {
      return secureError('Failed to save video', 500, videoError)
    }

    // Hand off to the cutter. It replies 202 as soon as the background job
    // starts; the actual analysis takes minutes and reports straight to Supabase.
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000)
    let dispatchRes: Response
    try {
      dispatchRes = await fetch(`${CUTTER_URL}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-cutter-secret': process.env.CUTTER_SECRET as string,
        },
        body: JSON.stringify({
          videoId: video.id,
          fileUrl,
          game,
          momentTypes: momentTypes ?? [],
          durationSec: typeof durationSec === 'number' ? durationSec : null,
        }),
        signal: controller.signal,
      })
    } catch (err) {
      clearTimeout(timeoutId)
      // The job never started — remove the dangling "processing" row so the
      // dashboard doesn't show a video that will never finish.
      await supabase.from('videos').delete().eq('id', video.id)
      console.error('[analyze] cutter unreachable:', err)
      return secureError('Analysis service is unavailable, please try again', 502)
    }
    clearTimeout(timeoutId)

    if (dispatchRes.status !== 202) {
      const json = await dispatchRes.json().catch(() => ({}))
      await supabase.from('videos').delete().eq('id', video.id)
      console.error('[analyze] cutter rejected job:', dispatchRes.status, json)
      return secureError(
        (json as { error?: string })?.error || 'Analysis service rejected the request',
        502
      )
    }

    // Bump the user's usage_minutes by the reported video duration.
    if (typeof durationSec === 'number' && durationSec > 0) {
      const minutes = Math.max(1, Math.round(durationSec / 60))
      const { data: profile } = await supabase
        .from('profiles')
        .select('usage_minutes')
        .eq('id', userId)
        .maybeSingle()

      if (profile) {
        await supabase
          .from('profiles')
          .update({ usage_minutes: (profile.usage_minutes ?? 0) + minutes })
          .eq('id', userId)
      }
    }

    return secureJson({ videoId: video.id, status: 'processing' })
  } catch (error) {
    console.error('[analyze] unhandled error:', error)
    return secureError('Analysis failed', 500, error)
  }
}
