// Cut route stub. The full FFmpeg-based implementation requires native binaries
// (ffmpeg-static + fluent-ffmpeg) that do not run reliably on Vercel serverless.
// This stub keeps the API path responding with a clean 503 so the client can
// surface a useful message instead of crashing on a missing endpoint.
//
// To re-enable: bring back fluent-ffmpeg + ffmpeg-static and deploy to an env
// with FFmpeg available (self-hosted Node, fly.io, Render, etc.).
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function POST() {
  return NextResponse.json(
    { error: 'Video cutting requires a self-hosted deployment' },
    {
      status: 503,
      headers: {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
      },
    }
  )
}
