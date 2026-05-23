import { NextResponse } from 'next/server'

// Defense-in-depth response headers applied to every API response.
// - nosniff:  blocks MIME-type sniffing-based attacks
// - DENY:     prevents the app from being framed (clickjacking)
// - referrer: don't leak full URLs to third parties
const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
}

export function applySecurityHeaders(headers: Headers): Headers {
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) {
    headers.set(k, v)
  }
  return headers
}

// Build a JSON response with security headers pre-applied.
export function secureJson<T>(data: T, init?: ResponseInit): NextResponse {
  const res = NextResponse.json(data as any, init)
  applySecurityHeaders(res.headers)
  return res
}

// Build a JSON error response with a safe, generic message + security headers.
// `internalError` is for server-side logging only; never returned to client.
export function secureError(
  publicMessage: string,
  status: number,
  internalError?: unknown,
  extraHeaders?: Record<string, string>
): NextResponse {
  if (internalError !== undefined) {
    console.error(`[api ${status}] ${publicMessage}:`, internalError)
  }
  const res = NextResponse.json({ error: publicMessage }, { status })
  applySecurityHeaders(res.headers)
  if (extraHeaders) {
    for (const [k, v] of Object.entries(extraHeaders)) {
      res.headers.set(k, v)
    }
  }
  return res
}

// Wrap a Response (e.g. a streamed file body) with the same security headers.
export function withSecurityHeaders(response: Response): Response {
  applySecurityHeaders(response.headers)
  return response
}
