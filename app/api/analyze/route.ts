// Required env vars:
//   GEMINI_API_KEY, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
//   CLOUDINARY_CLOUD_NAME (for thumbnail URL derivation only - public cloud_name)
import { NextRequest } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { createClient } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/security/rate-limit'
import { secureJson, secureError } from '@/lib/security/headers'
import {
  isCloudinaryUrl,
  isPositiveNumber,
  hasOnlyKeys,
} from '@/lib/security/validators'
import { requireEnv } from '@/lib/security/env'

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || 'dffygtstq'
const MAX_DURATION_SEC = 7200 // 2 hours

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

function publicIdFromUrl(url: string | null | undefined): string | null {
  if (!url) return null
  const match = url.match(/\/video\/upload\/(?:[^/]+\/)*?(?:v\d+\/)?([^?]+)\.[a-z0-9]+(?:\?.*)?$/i)
  return match ? match[1] : null
}

function thumbnailFor(publicId: string, startTime: number): string {
  const so = Math.max(0, Math.floor(startTime))
  return `https://res.cloudinary.com/${CLOUD_NAME}/video/upload/so_${so},w_640,h_360,c_fill,f_jpg/${publicId}.jpg`
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
    requireEnv(['GEMINI_API_KEY', 'NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'])
  } catch (err) {
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

  // Validate the Cloudinary delivery URL. Must be HTTPS on res.cloudinary.com.
  if (!isCloudinaryUrl(fileUrl)) {
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
    const prompt = `You are an expert gaming clip detector. Analyze this gameplay video from ${game}. Find exactly 5 of the most exciting, funny, or impressive moments. Look for: kills, clutch plays, funny accidents, rage moments, epic fails, unexpected events. For each moment give a start_time and end_time that captures the full context (minimum 8 seconds, maximum 30 seconds). Return only valid JSON: { "moments": [{ "start_time": 10, "end_time": 28, "moment_type": "kill", "confidence": 87, "description": "Clean headshot from across the map" }] }`

    const text = await generateWithRetry(prompt)
    const clean = text.replace(/```json|```/g, '').trim()
    let parsed: any
    try {
      parsed = JSON.parse(clean)
    } catch (parseErr) {
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
        file_url: fileUrl,
        game,
        status: 'ready',
        user_id: userId,
      })
      .select()
      .single()

    if (videoError) {
      return secureError('Failed to save video', 500, videoError)
    }

    const publicId = publicIdFromUrl(fileUrl as string)

    if (video && parsed?.moments && Array.isArray(parsed.moments)) {
      const rows = parsed.moments.map((m: any) => ({
        video_id: video.id,
        start_time: m.start_time,
        end_time: m.end_time,
        moment_type: m.moment_type,
        confidence: m.confidence,
        thumbnail_url: publicId ? thumbnailFor(publicId, Number(m.start_time) || 0) : null,
      }))
      const { error: insertErr } = await supabase.from('clips').insert(rows)
      if (insertErr) {
        // Don't fail the request — the video row already saved.
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
    return secureError('Analysis failed', 500, error)
  }
}
