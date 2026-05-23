// Required env vars:
//   CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
import { NextRequest } from 'next/server'
import { v2 as cloudinary } from 'cloudinary'
import { Readable } from 'node:stream'
import { rateLimit } from '@/lib/security/rate-limit'
import { secureJson, secureError } from '@/lib/security/headers'
import {
  isAllowedVideoMime,
  MAX_UPLOAD_BYTES,
  ALLOWED_VIDEO_MIMES,
} from '@/lib/security/validators'
import { requireEnv } from '@/lib/security/env'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

// Force the Node runtime so we get node:stream (Edge can't pipe to Cloudinary).
export const runtime = 'nodejs'
export const maxDuration = 60

function validateCloudinaryPlaceholders(): string | null {
  const secret = process.env.CLOUDINARY_API_SECRET
  // Catch obvious placeholders so failures are clear instead of "Invalid Signature".
  if (secret && /^\*+$/.test(secret)) {
    return 'CLOUDINARY_API_SECRET is set to a placeholder (asterisks). Replace it with the real secret.'
  }
  if (secret && secret.length < 20) {
    return 'CLOUDINARY_API_SECRET looks too short to be valid.'
  }
  return null
}

// Rate limit: 20 uploads per minute per IP. Uploads are bandwidth-heavy but
// users do legitimately retry on big files, so we give them more headroom than analyze/cut.
export async function POST(request: NextRequest) {
  const limit = await rateLimit(request, 'upload', 20, 60)
  if (!limit.success) {
    return secureError('Too many requests, please slow down', 429, undefined, {
      'Retry-After': String(limit.retryAfter),
    })
  }

  try {
    requireEnv(['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'])
  } catch (err) {
    return secureError('Server misconfigured', 500, err)
  }

  const placeholderErr = validateCloudinaryPlaceholders()
  if (placeholderErr) {
    return secureError('Server misconfigured', 500, placeholderErr)
  }

  // Fast-path: reject oversized uploads before reading the body. Saves bandwidth
  // and avoids buffering multi-GB junk into the runtime.
  const contentLength = Number(request.headers.get('content-length') || 0)
  if (contentLength && contentLength > MAX_UPLOAD_BYTES) {
    return secureError(
      `File too large. Maximum size is ${Math.floor(MAX_UPLOAD_BYTES / (1024 * 1024 * 1024))} GB`,
      400
    )
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file')

    if (!file || typeof file === 'string') {
      return secureError('No file provided', 400)
    }
    const f = file as File

    if (!isAllowedVideoMime(f.type)) {
      return secureError(
        `Unsupported file type. Allowed: ${Array.from(ALLOWED_VIDEO_MIMES).join(', ')}`,
        400
      )
    }

    if (f.size > MAX_UPLOAD_BYTES) {
      return secureError(
        `File too large. Maximum size is ${Math.floor(MAX_UPLOAD_BYTES / (1024 * 1024 * 1024))} GB`,
        400
      )
    }

    if (f.size === 0) {
      return secureError('File is empty', 400)
    }

    // Pipe the browser File stream straight into Cloudinary upload_stream so
    // we never materialize the whole video in process memory.
    const webStream = f.stream() as unknown as ReadableStream<Uint8Array>
    const nodeStream = Readable.fromWeb(webStream as any)

    const result = await new Promise<any>((resolve, reject) => {
      const cloudStream = cloudinary.uploader.upload_stream(
        { resource_type: 'video', folder: 'clipforge' },
        (error, uploaded) => {
          if (error) reject(error)
          else resolve(uploaded)
        }
      )

      nodeStream.on('error', (err) => {
        cloudStream.destroy(err as Error)
        reject(err)
      })

      nodeStream.pipe(cloudStream)
    })

    return secureJson(result)
  } catch (error) {
    return secureError('Upload failed', 500, error)
  }
}
