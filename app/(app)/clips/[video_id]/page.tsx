'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { motion } from 'framer-motion'
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

export default function ClipsPage() {
  const params = useParams<{ video_id: string }>()
  const video_id = params?.video_id

  const [clips, setClips] = useState<Clip[]>([])
  const [video, setVideo] = useState<VideoInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // Set of clip IDs currently being cut - each card tracks its own state.
  const [cuttingIds, setCuttingIds] = useState<Set<string>>(new Set())
  const [exporting, setExporting] = useState<string | null>(null)

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
      .select('id, title, file_name, game')
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

  async function handleCut(clipId: string) {
    if (!video_id || cuttingIds.has(clipId)) return

    setCuttingIds((prev) => {
      const next = new Set(prev)
      next.add(clipId)
      return next
    })
    setError(null)

    const toastId = toast.loading('Cutting clip...', {
      description: 'FFmpeg is re-encoding for a frame-accurate cut',
    })

    try {
      const res = await fetch('/api/cut', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ video_id, clip_id: clipId }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(json?.error || `Cut failed (${res.status})`)
      }

      const refreshed = await fetchClips()
      if (!refreshed.ok) {
        setError(refreshed.message || 'Refresh failed')
        toast.error('Cut finished but refresh failed', {
          id: toastId,
          description: refreshed.message,
        })
        return
      }

      const result = (json?.clips || [])[0]
      if (result?.url) {
        toast.success('Clip ready', {
          id: toastId,
          description: 'Export is now active',
        })
      } else {
        toast.error('Cut failed', {
          id: toastId,
          description: result?.error || 'No URL returned',
        })
      }
    } catch (e: any) {
      const msg = e?.message || 'Cut failed'
      setError(msg)
      toast.error('Cut failed', { id: toastId, description: msg })
    } finally {
      setCuttingIds((prev) => {
        const next = new Set(prev)
        next.delete(clipId)
        return next
      })
    }
  }

  function handleExport(clipId: string, hasUrl: boolean) {
    if (!hasUrl) {
      const msg = 'This clip has not been cut yet. Click "Cut Clip" first.'
      setError(msg)
      toast.warning(msg)
      return
    }
    setExporting(clipId)
    window.location.href = `/api/export?clip_id=${encodeURIComponent(clipId)}`
    toast.success('Download started')
    setTimeout(() => setExporting(null), 1500)
  }

  const cuttableCount = clips.filter((c) => !c.clip_url).length

  return (
    <div className="mx-auto max-w-7xl">
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
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 py-24"
        >
          <div className="gradient-bg mb-6 rounded-2xl p-4">
            <Film className="h-10 w-10 text-white" />
          </div>
          <h2 className="mb-2 text-xl font-semibold">No clips for this video yet</h2>
          <p className="mb-6 text-muted-foreground">
            Run the analyzer to find moments, then come back here to cut them.
          </p>
          <Button className="gradient-bg text-white" asChild>
            <Link href="/dashboard">Back to dashboard</Link>
          </Button>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
        >
          {clips.map((clip, index) => {
            const duration = Math.max(0, clip.end_time - clip.start_time)
            const isExporting = exporting === clip.id
            const isCutting = cuttingIds.has(clip.id)
            const canExport = Boolean(clip.clip_url)

            return (
              <motion.div
                key={clip.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
              >
                <Card className="overflow-hidden transition-all glow-hover">
                  {clip.thumbnail_url && (
                    <div className="relative aspect-video w-full overflow-hidden bg-secondary">
                      <div
                        className="absolute inset-0 bg-cover bg-center transition-transform duration-300 hover:scale-105"
                        style={{ backgroundImage: `url(${clip.thumbnail_url})` }}
                        role="img"
                        aria-label={`${clip.moment_type || 'clip'} preview`}
                      />
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
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
                      <Badge
                        variant="outline"
                        className={confidenceColor(clip.confidence)}
                      >
                        {Math.round(safeConfidence(clip.confidence))}%
                      </Badge>
                    </div>

                    <div className="mb-4 flex items-center gap-2">
                      {clip.clip_url ? (
                        <Badge
                          variant="outline"
                          className="border-green-500/30 bg-green-500/20 text-green-500"
                        >
                          Cut ready
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="border-muted-foreground/30 bg-muted/40 text-muted-foreground"
                        >
                          Not cut yet
                        </Badge>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="secondary"
                        className="flex-1"
                        onClick={() => handleCut(clip.id)}
                        disabled={isCutting}
                      >
                        {isCutting ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Scissors className="mr-2 h-4 w-4" />
                        )}
                        {isCutting ? 'Cutting...' : 'Cut Clip'}
                      </Button>
                      <Button
                        className="gradient-bg flex-1 text-white"
                        onClick={() => handleExport(clip.id, canExport)}
                        disabled={!canExport || isExporting}
                      >
                        {isExporting ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Download className="mr-2 h-4 w-4" />
                        )}
                        Export
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </motion.div>
      )}
    </div>
  )
}
