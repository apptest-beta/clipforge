// Tiny inline validators. We keep this dependency-free (no zod) since we only
// need a handful of shapes and want fast cold starts on serverless routes.

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value)
}

const GUEST_ID_RE = new RegExp(`^guest_${UUID_RE.source.slice(1, -1)}$`, 'i')

// Guest sessions don't have a Supabase user - the client mints a
// `guest_<uuid>` ID (see lib/guest.ts) that we accept as a stand-in `user_id`.
export function isGuestId(value: unknown): value is string {
  return typeof value === 'string' && GUEST_ID_RE.test(value)
}

export function isPositiveNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}

// Validate a Cloudinary delivery URL: must be https and live on res.cloudinary.com.
export function isCloudinaryUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false
  try {
    const u = new URL(value)
    return u.protocol === 'https:' && u.hostname === 'res.cloudinary.com'
  } catch {
    return false
  }
}

// Stricter variant: must point at our specific account so the export route
// can't be tricked into fetching arbitrary cloudinary tenants.
export function isOwnCloudinaryUrl(value: unknown, cloudName: string): value is string {
  if (!isCloudinaryUrl(value)) return false
  return value.startsWith(`https://res.cloudinary.com/${cloudName}/`)
}

// Any plain http(s) URL - used to pick a directly-downloadable source URL
// (e.g. preferring a raw Uploadthing URL over a broken Cloudinary fetch URL).
export function isHttpUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false
  try {
    const u = new URL(value)
    return u.protocol === 'https:' || u.protocol === 'http:'
  } catch {
    return false
  }
}

// File-size guard: 2 GB hard cap for uploads, matches the Vercel + Cloudinary practical ceiling.
export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024 * 1024

export const ALLOWED_VIDEO_MIMES = new Set<string>([
  'video/mp4',
  'video/quicktime',
  'video/x-msvideo',
  'video/webm',
  'video/x-matroska',
])

export function isAllowedVideoMime(mime: unknown): mime is string {
  return typeof mime === 'string' && ALLOWED_VIDEO_MIMES.has(mime)
}

// Reject unexpected fields on incoming JSON bodies. Helps prevent prototype
// pollution and "smuggling" extra params past our validators.
export function hasOnlyKeys(obj: unknown, allowed: readonly string[]): boolean {
  if (!obj || typeof obj !== 'object') return false
  const set = new Set(allowed)
  for (const k of Object.keys(obj)) {
    if (!set.has(k)) return false
  }
  return true
}
