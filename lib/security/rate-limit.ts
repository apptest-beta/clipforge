import type { NextRequest } from 'next/server'

// Per-IP rate limiter with two backends:
//   1. Upstash Redis (production) — if UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN env vars are set.
//   2. In-memory Map (dev / fallback)   — process-local sliding window. Resets on cold start.
//
// Helpers return { success, retryAfter } where retryAfter is seconds until reset.

type LimitResult = { success: boolean; retryAfter: number }

// ----- Upstash backend (lazy-loaded so dev doesn't need the dep) -----

type RatelimitInstance = { limit: (id: string) => Promise<{ success: boolean; reset: number }> }
const upstashCache = new Map<string, RatelimitInstance>()

async function getUpstashLimiter(
  bucket: string,
  limit: number,
  windowSec: number
): Promise<RatelimitInstance | null> {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null
  }
  const key = `${bucket}:${limit}:${windowSec}`
  const cached = upstashCache.get(key)
  if (cached) return cached

  try {
    const { Ratelimit } = await import('@upstash/ratelimit')
    const { Redis } = await import('@upstash/redis')
    const limiter: RatelimitInstance = new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(limit, `${windowSec} s`),
      prefix: `cf:${bucket}`,
      analytics: false,
    }) as unknown as RatelimitInstance
    upstashCache.set(key, limiter)
    return limiter
  } catch (err) {
    console.warn('[rate-limit] Upstash unavailable, falling back to memory:', err)
    return null
  }
}

// ----- In-memory backend -----

type Bucket = { count: number; resetAt: number }
const memoryStore = new Map<string, Bucket>()

function memoryLimit(id: string, limit: number, windowSec: number): LimitResult {
  const now = Date.now()
  const windowMs = windowSec * 1000
  const existing = memoryStore.get(id)

  if (!existing || existing.resetAt <= now) {
    memoryStore.set(id, { count: 1, resetAt: now + windowMs })
    return { success: true, retryAfter: 0 }
  }

  if (existing.count >= limit) {
    return { success: false, retryAfter: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)) }
  }

  existing.count += 1
  return { success: true, retryAfter: 0 }
}

// Best-effort cleanup so the Map doesn't grow unbounded under attack.
// Called probabilistically (1% of requests) to keep amortized cost ~O(1).
function maybeSweepMemory(now: number): void {
  if (Math.random() > 0.01) return
  for (const [k, v] of memoryStore) {
    if (v.resetAt <= now) memoryStore.delete(k)
  }
}

// ----- IP extraction -----

export function getClientIp(req: NextRequest): string {
  const xff = req.headers.get('x-forwarded-for')
  if (xff) {
    const first = xff.split(',')[0]?.trim()
    if (first) return first
  }
  const realIp = req.headers.get('x-real-ip')
  if (realIp) return realIp
  return 'unknown'
}

// ----- Public entry point -----

export async function rateLimit(
  req: NextRequest,
  bucket: string,
  limit: number,
  windowSec: number
): Promise<LimitResult> {
  const id = `${bucket}:${getClientIp(req)}`
  maybeSweepMemory(Date.now())

  const upstash = await getUpstashLimiter(bucket, limit, windowSec)
  if (upstash) {
    try {
      const { success, reset } = await upstash.limit(id)
      const retryAfter = success ? 0 : Math.max(1, Math.ceil((reset - Date.now()) / 1000))
      return { success, retryAfter }
    } catch (err) {
      console.warn('[rate-limit] Upstash call failed, falling back to memory for this request:', err)
    }
  }

  return memoryLimit(id, limit, windowSec)
}
