'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { FadeIn, StaggerContainer, StaggerItem, HoverLift } from '@/components/motion/motion-primitives'
import Link from 'next/link'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ArrowLeft,
  Scissors,
  Download,
  Loader2,
  Film,
  Target,
  Clock,
  AlertCircle,
  Gamepad2,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { cleanFilename } from '@/lib/utils'

type Clip = {
  id: string
  video_id: string
  start_time: number
  end_time: number
  moment_type: string
  confidence: number
  clip_url: string | null
  thumbnail_url: string | null
}

type VideoInfo = {
  id: string
  title: string | null
  file_name: string | null
  game: string | null
  file_url: string | null
  cloudinary_public_id: string | null
}

function formatTime(seconds: number) {
  const total = Math.max(0, Math.floor(seconds))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

// Clamp confidence into the 0-100 display range. Gemini sometimes returns
// values >100 or NaN; we surface those as 0% rather than a broken UI.
function safeConfidence(value: number | null | undefined) {
  const n = Number(value)
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(100, n))
}

function confidenceColor(confidence: number) {
  const c = safeConfidence(confidence)
  if (c >= 90) return 'bg-green-500/20 text-green-500 border-green-500/30'
  if (c >= 75) return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30'
  return 'bg-orange-500/20 text-orange-500 border-orange-500/30'
}

// Pick a directly-playable source for the clip thumbnail capture below.
// `file_url` is often a Cloudinary "fetch" delivery URL that 401s, while
// `cloudinary_public_id` holds the raw Uploadthing URL (CORS-enabled and
// directly downloadable) - prefer that, and fall back to `file_url` for
// older rows that were uploaded straight to Cloudinary.
function pickVideoSrc(video: VideoInfo | null): string | null {
  if (!video) return null
  if (video.cloudinary_public_id?.startsWith('http')) return video.cloudinary_public_id
  if (video.file_url?.startsWith('http') && !video.file_url.includes('/video/fetch/')) {
    return video.file_url
  }
  return null
}

export default function ClipsPage() {
  const params = useParams<{ video_id: string }>()
  const video_id = params?.video_id

  const [clips, setClips] = useState<Clip[]>([])
  const [video, setVideo] = useState<VideoInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // Set of clip IDs currently being cut - each card tracks its own state.
  const [cuttingIds, setCuttingIds] = useState<Set<string>>(new Set())
  // Clip thumbnails captured client-side from the source video (clip_id -> data URL).
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({})
  const captureVideoRef = useRef<HTMLVideoElement>(null)
  const captureCanvasRef = useRef<HTMLCanvasElement>(null)

  const fetchClips = useCallback(async (): Promise<{ ok: boolean; message?: string }> => {
    if (!video_id) return { ok: false, message: 'Missing video_id' }
    const { data: userData } = await supabase.auth.getUser()
    const user = userData?.user
    if (!user) {
      setClips([])
      return { ok: false, message: 'Not authenticated' }
    }
    // Inner-join through `videos` so we only return clips that belong
    // to a video owned by the current user.
    const { data, error: qErr } = await supabase
      .from('clips')
      .select(
        'id, video_id, start_time, end_time, moment_type, confidence, clip_url, thumbnail_url, videos!inner(user_id)'
      )
      .eq('video_id', video_id)
      .eq('videos.user_id', user.id)
      .order('start_time', { ascending: true })

    if (qErr) return { ok: false, message: qErr.message }
    setClips((data || []) as unknown as Clip[])
    return { ok: true }
  }, [video_id])

  const fetchVideo = useCallback(async (): Promise<{ ok: boolean; message?: string }> => {
    if (!video_id) return { ok: false, message: 'Missing video_id' }
    const { data: userData } = await supabase.auth.getUser()
    const user = userData?.user
    if (!user) {
      setVideo(null)
      return { ok: false, message: 'Not authenticated' }
    }
    const { data, error: qErr } = await supabase
      .from('videos')
      .select('id, title, file_name, game, file_url, cloudinary_public_id')
      .eq('id', video_id)
      .eq('user_id', user.id)
      .single()
    if (qErr) return { ok: false, message: qErr.message }
    setVideo((data as VideoInfo) || null)
    return { ok: true }
  }, [video_id])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      const [clipsRes, videoRes] = await Promise.all([fetchClips(), fetchVideo()])
      if (cancelled) return
      if (!clipsRes.ok) setError(clipsRes.message || 'Failed to load clips')
      else if (!videoRes.ok) setError(videoRes.message || 'Failed to load video')
      setLoading(false)
    }
    if (video_id) load()
    return () => {
      cancelled = true
    }
  }, [video_id, fetchClips, fetchVideo])

  // Generate per-clip thumbnails by seeking a hidden <video> to each clip's
  // start time and capturing the frame to a <canvas>. `clip.thumbnail_url`
  // from the analyze step isn't reliable (Cloudinary fetch delivery is
  // unavailable for this account), so we build previews ourselves.
  useEffect(() => {
    const src = pickVideoSrc(video)
    const videoEl = captureVideoRef.current
    const canvas = captureCanvasRef.current
    if (!src || !videoEl || !canvas || clips.length === 0) return

    let cancelled = false

    async function run() {
      videoEl!.crossOrigin = 'anonymous'
      videoEl!.src = src!
      await new Promise<void>((resolve, reject) => {
        videoEl!.onloadedmetadata = () => resolve()
        videoEl!.onerror = () => reject(new Error('Failed to load source video for thumbnails'))
      })

      const ctx = canvas!.getContext('2d')
      if (!ctx) return
      canvas!.width = 320
      canvas!.height = 180

      // Chunked/streamed sources often report duration as 0 (or Infinity)
      // right after `loadedmetadata` - wait briefly for the real duration
      // via `durationchange`, otherwise every clip's clamped time collapses
      // to 0 and they all capture the same blank first frame.
      let duration = videoEl!.duration
      if (!Number.isFinite(duration) || duration <= 0) {
        duration = await new Promise<number>((resolve) => {
          const onChange = () => {
            const d = videoEl!.duration
            if (Number.isFinite(d) && d > 0) {
              videoEl!.removeEventListener('durationchange', onChange)
              clearTimeout(timer)
              resolve(d)
            }
          }
          const timer = setTimeout(() => {
            videoEl!.removeEventListener('durationchange', onChange)
            resolve(videoEl!.duration)
          }, 2000)
          videoEl!.addEventListener('durationchange', onChange)
        })
      }

      for (let i = 0; i < clips.length; i++) {
        const clip = clips[i]
        if (cancelled) return
        let time = clip.start_time
        if (Number.isFinite(duration) && duration > 0) {
          const maxTime = Math.max(0, duration - 0.1)
          if (time > maxTime) {
            // Out-of-range timestamp (e.g. analysis returned a time past the
            // actual video length) - spread these across the video so each
            // clip still gets a distinct frame instead of all clamping to
            // the same end-of-video moment.
            time = Math.min(maxTime, (maxTime * (i + 1)) / (clips.length + 1))
          }
        }

        await new Promise<void>((resolve) => {
          let done = false
          const finish = () => {
            if (done) return
            done = true
            videoEl!.removeEventListener('seeked', onSeeked)
            clearTimeout(timer)
            resolve()
          }
          const onSeeked = () => finish()
          // If currentTime doesn't actually change, `seeked` never fires -
          // fall back to a timeout so the loop can't hang and strand the
          // remaining clips on the duplicate `thumbnail_url`.
          const timer = setTimeout(finish, 1000)
          videoEl!.addEventListener('seeked', onSeeked)
          videoEl!.currentTime = time
        })

        if (cancelled) return
        // Give the browser a couple of frames to actually paint the seeked
        // frame before we read it off the canvas.
        await new Promise<void>((resolve) => {
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
        })

        if (cancelled) return
        try {
          ctx.drawImage(videoEl!, 0, 0, canvas!.width, canvas!.height)
          const dataUrl = canvas!.toDataURL('image/jpeg', 0.7)
          setThumbnails((prev) => ({ ...prev, [clip.id]: dataUrl }))
        } catch (err) {
          // CORS-tainted canvas or decode error - stop trying for this video.
          console.error('[clips] thumbnail capture failed:', err)
          return
        }
      }
    }

    run().catch((err) => console.error('[clips] thumbnail generation failed:', err))

    return () => {
      cancelled = true
    }
  }, [video, clips])

  // Download a clip in-tab: Cloudinary URLs are cross-origin, so the `download`
  // attribute on a plain <a> is ignored and the browser just opens a new tab.
  // Fetching the file as a blob and downloading via an object URL keeps
  // everything on this page and saves the file to the user's downloads folder.
  async function handleDownload(clip: Clip) {
    if (!clip.clip_url) return
    try {
      const res = await fetch(clip.clip_url)
      if (!res.ok) throw new Error(`Download failed (${res.status})`)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${clip.moment_type || 'clip'}_${clip.id}.mp4`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (e: any) {
      toast.error('Download failed', { description: e?.message || 'Could not download clip' })
    }
  }

  async function handleCut(clipId: string) {
    if (!video_id || cuttingIds.has(clipId)) return

    const clip = clips.find((c) => c.id === clipId)
    if (!clip) return

    setCuttingIds((prev) => {
      const next = new Set(prev)
      next.add(clipId)
      return next
    })
    setError(null)

    try {
      const res = await fetch('/api/cut', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          videoId: clip.video_id,
          startTime: clip.start_time,
          endTime: clip.end_time,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(json?.error || `Cut failed (${res.status})`)
      }

      await fetchClips()
      toast.success('Clip ready', { description: 'Your clip has been cut successfully' })
    } catch (e: any) {
      const msg = e?.message || 'Cut failed'
      setError(msg)
      toast.error('Cut failed', { description: msg })
    } finally {
      setCuttingIds((prev) => {
        const next = new Set(prev)
        next.delete(clipId)
        return next
      })
    }
  }


  const cuttableCount = clips.filter((c) => !c.clip_url).length

  return (
    <div className="mx-auto max-w-7xl">
      {/* Hidden elements used to capture per-clip thumbnails from the source video */}
      <video ref={captureVideoRef} muted playsInline className="hidden" />
      <canvas ref={captureCanvasRef} className="hidden" />

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex min-w-0 items-center gap-4">
          <Button variant="ghost" size="icon" asChild className="shrink-0">
            <Link href="/dashboard" aria-label="Back to dashboard">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="min-w-0">
            {loading ? (
              <>
                <Skeleton className="h-8 w-64" />
                <Skeleton className="mt-2 h-4 w-48" />
              </>
            ) : (
              <>
                <h1 className="truncate text-3xl font-bold">
                  {(video?.title && video.title.trim()) || cleanFilename(video?.file_name)}
                </h1>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                  {video?.game && (
                    <span className="flex items-center gap-1.5">
                      <Gamepad2 className="h-3.5 w-3.5" />
                      {video.game}
                    </span>
                  )}
                  {video?.game && clips.length > 0 && <span>{'·'}</span>}
                  <span>
                    {clips.length === 0
                      ? 'No clips found for this video'
                      : `${clips.length} clip${clips.length === 1 ? '' : 's'}${
                          cuttableCount > 0 ? ` · ${cuttableCount} not yet cut` : ''
                        }`}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </motion.div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4"
        >
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
          <div className="flex-1">
            <p className="text-sm font-medium text-destructive">{error}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setError(null)}
            className="text-destructive hover:text-destructive"
          >
            Dismiss
          </Button>
        </motion.div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : clips.length === 0 ? (
        <FadeIn>
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 py-24">
          <div className="mb-6 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-4">
            <Film className="h-10 w-10 text-[#888888]" />
          </div>
          <h2 className="mb-2 text-xl font-semibold">No highlights found</h2>
          <p className="mb-6 text-muted-foreground">Try uploading a different video</p>
          <Button className="gradient-bg text-white" asChild>
            <Link href="/dashboard">Back to dashboard</Link>
          </Button>
        </div>
        </FadeIn>
      ) : (
        <StaggerContainer className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {clips.map((clip, index) => {
            const duration = Math.max(0, clip.end_time - clip.start_time)
            const isCutting = cuttingIds.has(clip.id)

            return (
              <StaggerItem key={clip.id}>
                <HoverLift>
                  <ClipCard
                    clip={clip}
                    index={index}
                    duration={duration}
                    isCutting={isCutting}
                    onCut={handleCut}
                    onDownload={handleDownload}
                    thumbSrc={thumbnails[clip.id]}
                  />
                </HoverLift>
              </StaggerItem>
            )
          })}
        </StaggerContainer>
      )}
    </div>
  )
}

function ClipCard({
  clip,
  index,
  duration,
  isCutting,
  onCut,
  onDownload,
  thumbSrc,
}: {
  clip: Clip
  index: number
  duration: number
  isCutting: boolean
  onCut: (id: string) => void
  onDownload: (clip: Clip) => void
  thumbSrc?: string
}) {
  const preview = thumbSrc || clip.thumbnail_url
  return (
    <Card className="overflow-hidden">
        {preview ? (
          <div className="relative aspect-video w-full overflow-hidden bg-secondary">
            <div
              className="absolute inset-0 bg-cover bg-center transition-transform duration-300 hover:scale-105"
              style={{ backgroundImage: `url(${preview})` }}
              role="img"
              aria-label={`${clip.moment_type || 'clip'} preview`}
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          </div>
        ) : (
          <div className="relative flex aspect-video w-full items-center justify-center overflow-hidden bg-secondary">
            <Film className="h-8 w-8 text-muted-foreground/40" />
          </div>
        )}
        <CardContent className="p-5">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex items-center gap-2">
                <Target className="h-4 w-4 text-muted-foreground" />
                <h3 className="truncate font-semibold capitalize">
                  {clip.moment_type || 'Moment'}
                </h3>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                <span>
                  {formatTime(clip.start_time)} {'→'} {formatTime(clip.end_time)}
                </span>
                <span className="text-xs">{'·'}</span>
                <span>{duration.toFixed(1)}s</span>
              </div>
            </div>
            <Badge variant="outline" className={confidenceColor(clip.confidence)}>
              {Math.round(safeConfidence(clip.confidence))}%
            </Badge>
          </div>

          <div className="mb-4 flex items-center gap-2">
            {clip.clip_url ? (
              <Badge variant="outline" className="border-green-500/30 bg-green-500/20 text-green-500">
                Cut ready
              </Badge>
            ) : (
              <Badge variant="outline" className="border-muted-foreground/30 bg-muted/40 text-muted-foreground">
                Not cut yet
              </Badge>
            )}
            <Badge variant="outline" className="border-border bg-secondary/50 text-muted-foreground">
              {Math.round(clip.end_time - clip.start_time)}s
            </Badge>
          </div>

          <div className="flex gap-2">
            <AnimatePresence mode="wait">
              {clip.clip_url ? (
                <motion.div
                  key="download"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex-1"
                >
                  <Button
                    variant="outline"
                    className="w-full cursor-pointer border-green-500 bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white"
                    onClick={() => onDownload(clip)}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </Button>
                </motion.div>
              ) : (
                <Button
                  key="cut"
                  variant="secondary"
                  className="flex-1 cursor-pointer"
                  onClick={() => onCut(clip.id)}
                  disabled={isCutting}
                >
                  {isCutting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Scissors className="mr-2 h-4 w-4" />
                  )}
                  {isCutting ? 'Cutting...' : 'Cut Clip'}
                </Button>
              )}
            </AnimatePresence>
          </div>
        </CardContent>
      </Card>
  )
}
