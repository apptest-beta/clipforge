// Required env vars:
//   GEMINI_API_KEY, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
//   CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
import { NextRequest } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { v2 as cloudinary } from 'cloudinary'
import { createClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/security/rate-limit'
import { secureJson, secureError } from '@/lib/security/headers'
import {
  isPositiveNumber,
  hasOnlyKeys,
} from '@/lib/security/validators'
import { requireEnv } from '@/lib/security/env'

const MAX_DURATION_SEC = 7200 // 2 hours

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

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

function isRetryable(err: unknown): boolean {
  if (!err) return false
  const msg = err instanceof Error ? err.message : String(err)
  return /\b503\b|overload|unavailable|temporarily/i.test(msg)
}

async function generateWithRetry(prompt: string, attempts = 3, delayMs = 2000): Promise<string> {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })
  let lastError: unknown = null

  for (let i = 0; i < attempts; i++) {
    try {
      const result = await model.generateContent(prompt)
      return result.response.text()
    } catch (err) {
      lastError = err
      if (!isRetryable(err) || i === attempts - 1) throw err
      console.warn(`Gemini call failed (attempt ${i + 1}/${attempts}), retrying in ${delayMs}ms`)
      await sleep(delayMs)
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Gemini call failed')
}

function titleFromFileName(name: string | null | undefined): string {
  if (!name) return 'Recording'
  const base = name.replace(/^.*[\\/]/, '').replace(/\.[a-z0-9]+$/i, '')
  return base.trim() || 'Recording'
}

// Generate a thumbnail URL using the Cloudinary public_id of the uploaded video.
function thumbnailFor(publicId: string, startTime: number): string {
  const so = Math.max(0, Math.floor(startTime))
  return cloudinary.url(publicId, {
    resource_type: 'video',
    transformation: [{ start_offset: so, width: 640, height: 360, crop: 'fill' }],
    format: 'jpg',
  })
}

// Allowed top-level keys on the incoming JSON body. Anything else is rejected.
const ALLOWED_KEYS = ['game', 'momentTypes', 'fileName', 'fileUrl', 'durationSec'] as const

// Rate limit: 10 analyze calls per minute per IP. Each call hits Gemini + Supabase,
// so the limit is tighter than upload/export to protect API quotas and costs.
export async function POST(request: NextRequest) {
  const limit = await rateLimit(request, 'analyze', 10, 60)
  if (!limit.success) {
    return secureError('Too many requests, please slow down', 429, undefined, {
      'Retry-After': String(limit.retryAfter),
    })
  }

  try {
    requireEnv([
      'GEMINI_API_KEY',
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'CLOUDINARY_CLOUD_NAME',
      'CLOUDINARY_API_KEY',
      'CLOUDINARY_API_SECRET',
    ])
  } catch (err) {
    console.error('[analyze] missing env vars:', err)
    return secureError('Server misconfigured', 500, err)
  }

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  })

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
    // Use Cloudinary's fetch transformation to reference the Uploadthing video directly —
    // no upload needed. The raw fileUrl doubles as the public_id for thumbnail generation.
    const cloudinaryPublicId: string = fileUrl as string
    const cloudinarySecureUrl: string = cloudinary.url(fileUrl as string, {
      type: 'fetch',
      resource_type: 'video',
      secure: true,
    })

    const prompt = `You are an expert gaming clip detector. Analyze this gameplay video from ${game}. Find exactly 5 of the most exciting, funny, or impressive moments. Look for: kills, clutch plays, funny accidents, rage moments, epic fails, unexpected events. For each moment give a start_time and end_time that captures the full context (minimum 8 seconds, maximum 30 seconds). Return only valid JSON: { "moments": [{ "start_time": 10, "end_time": 28, "moment_type": "kill", "confidence": 87, "description": "Clean headshot from across the map" }] }`

    let text: string
    try {
      text = await generateWithRetry(prompt)
    } catch (err) {
      console.error('[analyze] gemini error:', err)
      return secureError('AI analysis failed', 500, err)
    }

    const clean = text.replace(/```json|```/g, '').trim()
    let parsed: any
    try {
      parsed = JSON.parse(clean)
    } catch (parseErr) {
      console.error('[analyze] JSON parse error:', parseErr)
      return secureError('Analysis returned invalid data', 502, parseErr)
    }

    const supabase = await createClient()
    const { data: userData } = await supabase.auth.getUser()
    const userId = userData?.user?.id ?? null

    const { data: video, error: videoError } = await supabase
      .from('videos')
      .insert({
        file_name: (fileName as string) || 'upload',
        title: titleFromFileName(fileName as string | null | undefined),
        file_url: cloudinarySecureUrl,
        game,
        status: 'ready',
        user_id: userId,
        cloudinary_public_id: cloudinaryPublicId,
      })
      .select()
      .single()

    if (videoError) {
      return secureError('Failed to save video', 500, videoError)
    }

    if (!parsed?.moments || !Array.isArray(parsed.moments) || parsed.moments.length === 0) {
      return secureJson({ moments: [], message: 'No highlights found', videoId: video?.id })
    }

    if (video && parsed?.moments && Array.isArray(parsed.moments)) {
      const rows = parsed.moments.map((m: any) => ({
        video_id: video.id,
        start_time: m.start_time,
        end_time: m.end_time,
        moment_type: m.moment_type,
        confidence: m.confidence,
        thumbnail_url: thumbnailFor(cloudinaryPublicId, Number(m.start_time) || 0),
      }))
      const { error: insertErr } = await supabase.from('clips').insert(rows)
      if (insertErr) {
        // Don't fail the request - the video row already saved.
        console.error('[analyze] clips insert failed:', insertErr)
      }
    }

    // Bump the user's usage_minutes by the video duration. Skipped for guest analysis.
    if (userId && typeof durationSec === 'number' && durationSec > 0) {
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

    return secureJson({ ...parsed, videoId: video?.id })
  } catch (error) {
    console.error('[analyze] unhandled error:', error)
    return secureError('Analysis failed', 500, error)
  }
}
