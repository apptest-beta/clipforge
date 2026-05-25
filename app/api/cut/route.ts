// Required env vars:
//   CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
//   NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { v2 as cloudinary } from 'cloudinary'
import fs from 'fs/promises'
import os from 'os'
import path from 'path'
import { randomUUID } from 'crypto'
import { rateLimit } from '@/lib/security/rate-limit'
import { secureJson, secureError } from '@/lib/security/headers'
import { isUuid, isOwnCloudinaryUrl, hasOnlyKeys } from '@/lib/security/validators'
import { requireEnv } from '@/lib/security/env'

// Route segment config - must be at module top so Next picks it up.
// runtime=nodejs because fluent-ffmpeg + ffmpeg-static need the Node runtime
// (binary spawn, fs access). maxDuration=300 gives FFmpeg + Cloudinary uploads
// up to 5 minutes per cut request on Vercel Pro.
export const runtime = 'nodejs'
export const maxDuration = 300

// Lazy-load fluent-ffmpeg + ffmpeg-static under try/catch. Both are native-binary
// deps that can fail to resolve on Vercel serverless if the binary wasn't traced
// into the bundle. Wrapping the load lets the build succeed and gives us a clean
// 503 at runtime instead of a hard crash on cold start.
let ffmpeg: any = null
let ffmpegLoadError: Error | null = null
try {
  ffmpeg = require('fluent-ffmpeg')
  const ffmpegPath: string | null = process.env.FFMPEG_PATH || require('ffmpeg-static')
  if (ffmpegPath) {
    ffmpeg.setFfmpegPath(ffmpegPath as string)
  }
} catch (err) {
  ffmpegLoadError = err as Error
  console.error('[cut] Failed to load ffmpeg deps:', err)
}

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || 'dffygtstq'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

async function downloadToTemp(url: string, dest: string): Promise<void> {
  let res: Response
  try {
    res = await fetch(url, { redirect: 'follow' })
  } catch (netErr: any) {
    throw new Error(`Network error downloading source video: ${netErr?.message || netErr}`)
  }

  const contentType = res.headers.get('content-type') || '<none>'

  if (!res.ok) {
    throw new Error(`Failed to download source video: HTTP ${res.status} ${res.statusText}`)
  }

  // Catch HTML/JSON responses up front - FFmpeg would otherwise call them "Invalid video file"
  if (/^text\/html|application\/json|application\/xml/i.test(contentType)) {
    throw new Error(`Cloudinary returned ${contentType} instead of a video`)
  }

  const buf = Buffer.from(await res.arrayBuffer())
  await fs.writeFile(dest, buf)

  const stat = await fs.stat(dest)
  if (stat.size === 0) {
    throw new Error('Downloaded source video is 0 bytes')
  }
}

function cutClip(input: string, output: string, start: number, end: number): Promise<void> {
  const duration = Math.max(0, end - start)
  return new Promise((resolve, reject) => {
    let stderrBuffer = ''
    let lastCommand = ''

    ffmpeg(input)
      .outputOptions([
        '-ss', String(start),
        '-t', String(duration),
        '-avoid_negative_ts', 'make_zero',
      ])
      .output(output)
      .on('start', (cmd: string) => {
        lastCommand = cmd
      })
      .on('stderr', (line: string) => {
        stderrBuffer = (stderrBuffer + line + '\n').slice(-2048)
      })
      .on('end', () => resolve())
      .on('error', (err: Error) => {
        console.error(`[cut] FFmpeg failed (${start}s-${end}s). Cmd: ${lastCommand}`)
        console.error(`[cut] FFmpeg stderr tail: ${stderrBuffer}`)
        reject(new Error(`FFmpeg cut failed: ${err.message}`))
      })
      .run()
  })
}

function extractThumbnail(input: string, output: string, atSeconds: number): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(input)
      .outputOptions(['-ss', String(Math.max(0, atSeconds)), '-frames:v', '1', '-q:v', '3'])
      .output(output)
      .on('end', () => resolve())
      .on('error', (err: Error) => reject(err))
      .run()
  })
}

function uploadClip(
  filePath: string,
  publicId: string
): Promise<{ secure_url: string; public_id: string }> {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload(
      filePath,
      { resource_type: 'video', format: 'mp4', folder: 'clipforge/clips', public_id: publicId, overwrite: true },
      (err, result) => {
        if (err || !result) reject(err || new Error('Cloudinary upload returned no result'))
        else resolve(result as { secure_url: string; public_id: string })
      }
    )
  })
}

function uploadThumbnail(
  filePath: string,
  publicId: string
): Promise<{ secure_url: string; public_id: string }> {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload(
      filePath,
      { resource_type: 'image', folder: 'clipforge/thumbnails', public_id: publicId, overwrite: true },
      (err, result) => {
        if (err || !result) reject(err || new Error('Cloudinary thumbnail upload returned no result'))
        else resolve(result as { secure_url: string; public_id: string })
      }
    )
  })
}

const ALLOWED_KEYS = ['video_id', 'clip_id'] as const

// Rate limit: 10 cuts per minute per IP. Cuts run FFmpeg + 2 Cloudinary uploads
// per clip - expensive on CPU + bandwidth, so we keep this tight.
export async function POST(request: NextRequest) {
  const limit = await rateLimit(request, 'cut', 10, 60)
  if (!limit.success) {
    return secureError('Too many requests, please slow down', 429, undefined, {
      'Retry-After': String(limit.retryAfter),
    })
  }

  // Fail fast if ffmpeg couldn't load at cold-start. Surfaces a clear 503
  // instead of letting downstream code blow up with a confusing TypeError.
  if (ffmpegLoadError || !ffmpeg) {
    return secureError(
      'Video processing is unavailable on this deployment',
      503,
      ffmpegLoadError || 'ffmpeg not loaded'
    )
  }

  try {
    requireEnv([
      'CLOUDINARY_CLOUD_NAME',
      'CLOUDINARY_API_KEY',
      'CLOUDINARY_API_SECRET',
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    ])
  } catch (err) {
    return secureError('Server misconfigured', 500, err)
  }

  let tempDir: string | null = null

  try {
    let body: unknown
    try {
      body = await request.json()
    } catch {
      return secureError('Invalid JSON body', 400)
    }

    if (!body || typeof body !== 'object' || !hasOnlyKeys(body, ALLOWED_KEYS)) {
      return secureError('Invalid request body', 400)
    }

    const { video_id, clip_id } = body as { video_id?: unknown; clip_id?: unknown }

    if (!isUuid(video_id)) {
      return secureError('video_id must be a valid UUID', 400)
    }
    if (clip_id !== undefined && clip_id !== null && !isUuid(clip_id)) {
      return secureError('clip_id must be a valid UUID', 400)
    }

    // 1. Look up the source video
    const { data: video, error: vErr } = await supabase
      .from('videos')
      .select('id, file_url')
      .eq('id', video_id)
      .single()

    if (vErr || !video) {
      return secureError('Video not found', 404, vErr)
    }
    if (!video.file_url) {
      return secureError('Video has no source URL', 400)
    }
    if (!isOwnCloudinaryUrl(video.file_url, CLOUD_NAME)) {
      return secureError('Video source URL is not allowed', 400, `Rejected url: ${video.file_url}`)
    }

    // 2. Pull clip timestamps for this video
    let clipsQuery = supabase
      .from('clips')
      .select('id, start_time, end_time')
      .eq('video_id', video_id)

    if (clip_id) {
      clipsQuery = clipsQuery.eq('id', clip_id)
    }

    const { data: clips, error: cErr } = await clipsQuery
    if (cErr) {
      return secureError('Failed to load clips', 500, cErr)
    }
    if (!clips || clips.length === 0) {
      return secureError(clip_id ? 'Clip not found for this video' : 'No clips to cut', 400)
    }

    // 3. Download source video once into a temp directory
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'clipforge-'))
    const sourcePath = path.join(tempDir, 'source.mp4')
    await downloadToTemp(video.file_url, sourcePath)

    const results: Array<{ clip_id: string | number; url: string | null; error?: string }> = []

    for (const clip of clips) {
      const id = (clip as { id: string | number }).id
      const start = Number((clip as { start_time: number }).start_time) || 0
      const end = Number((clip as { end_time: number }).end_time) || 0

      if (end <= start) {
        results.push({ clip_id: id, url: null, error: 'Invalid timestamp range' })
        continue
      }

      const outPath = path.join(tempDir, `clip_${id}.mp4`)
      const thumbPath = path.join(tempDir, `clip_${id}.jpg`)

      try {
        await cutClip(sourcePath, outPath, start, end)
        const idStub = randomUUID().slice(0, 8)
        const publicId = `${video_id}_${id}_${idStub}`
        const uploaded = await uploadClip(outPath, publicId)

        let thumbnailUrl: string | null = null
        try {
          const midpoint = (end - start) / 2
          await extractThumbnail(outPath, thumbPath, midpoint)
          const thumb = await uploadThumbnail(thumbPath, `${publicId}_thumb`)
          thumbnailUrl = thumb.secure_url
        } catch (thumbErr) {
          console.warn(`[cut] Thumbnail failed for clip ${id}:`, thumbErr)
        }

        const updatePayload: Record<string, string> = { clip_url: uploaded.secure_url }
        if (thumbnailUrl) updatePayload.thumbnail_url = thumbnailUrl

        const { error: updErr } = await supabase
          .from('clips')
          .update(updatePayload)
          .eq('id', id)

        results.push({
          clip_id: id,
          url: uploaded.secure_url,
          error: updErr ? 'Failed to save clip URL' : undefined,
        })
        if (updErr) console.error(`[cut] DB update failed for clip ${id}:`, updErr)
      } catch (clipErr: any) {
        console.error(`[cut] Cut failed for clip ${id}:`, clipErr)
        results.push({ clip_id: id, url: null, error: 'Cut failed' })
      }
    }

    return secureJson({ video_id, clips: results })
  } catch (error) {
    return secureError('Cut failed', 500, error)
  } finally {
    if (tempDir) {
      await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {})
    }
  }
}
