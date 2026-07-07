'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { StaggerContainer, StaggerItem, HoverLift, FadeIn } from '@/components/motion/motion-primitives'
import { VideoCard, VideoCardProps } from '@/components/video-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Upload, Search, Grid3x3, List, Film, Sparkles, Scissors } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { supabase } from '@/lib/supabase'
import { cleanFilename } from '@/lib/utils'
import { toast } from 'sonner'

// Turn a Cloudinary video URL into a first-frame JPG thumbnail.
// Inserts so_0 (start offset 0s) and swaps the video extension for .jpg.
// Only real Cloudinary upload-delivery URLs can be transformed this way —
// "fetch" delivery URLs 401 (disabled for this account) and newer rows store
// the raw Uploadthing URL, so anything else falls back to client-side capture.
function cloudinaryThumbnail(url: string | null | undefined): string {
  if (!url || !url.includes('/video/upload/')) return ''
  return url
    .replace('/video/upload/', '/video/upload/so_0/')
    .replace(/\.(mp4|mov|webm|mkv|avi)(\?|$)/i, '.jpg$2')
}

// Pick a directly-playable source for client-side thumbnail capture.
// `cloudinary_public_id` holds the raw Uploadthing URL (CORS-enabled and
// directly downloadable) when `file_url` is an unusable Cloudinary "fetch"
// delivery URL.
function pickVideoSrc(file_url: string | null, cloudinary_public_id: string | null): string | null {
  if (cloudinary_public_id?.startsWith('http')) return cloudinary_public_id
  if (file_url?.startsWith('http') && !file_url.includes('/video/fetch/')) return file_url
  return null
}

function normalizeStatus(status: string | null | undefined): VideoCardProps['status'] {
  if (status === 'processing' || status === 'rendering') return status
  return 'ready'
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Film
  label: string
  value: number
}) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-4">
      <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-elevated)] p-2.5">
        <Icon className="h-5 w-5 text-[var(--accent)]" />
      </div>
      <div>
        <p className="text-2xl font-bold leading-tight">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Skeleton className="h-10 w-full sm:max-w-xs" />
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-[140px]" />
          <Skeleton className="h-10 w-20" />
        </div>
      </div>
      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-xl border border-border bg-card">
            <Skeleton className="skeleton-shimmer aspect-video w-full" />
            <div className="space-y-3 p-4">
              <Skeleton className="h-5 w-3/4" />
              <div className="flex items-center gap-3">
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

export default function DashboardPage() {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [videos, setVideos] = useState<VideoCardProps[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // Sources to capture a first-frame thumbnail from, for videos whose
  // `file_url` is a broken Cloudinary "fetch" delivery URL.
  const [captureSources, setCaptureSources] = useState<Record<string, string>>({})
  // Captured first-frame thumbnails (video id -> data URL).
  const [capturedThumbnails, setCapturedThumbnails] = useState<Record<string, string>>({})
  // Library-wide totals shown in the stats row above the grid.
  const [stats, setStats] = useState({ clips: 0, cut: 0 })
  const captureVideoRef = useRef<HTMLVideoElement>(null)
  const captureCanvasRef = useRef<HTMLCanvasElement>(null)

  // Tracks unmount so in-flight loads (including background polls) don't set
  // state on a dead component.
  const mountedRef = useRef(true)
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  // `silent` skips the skeleton — used by the background poll so the grid
  // doesn't flicker while a video is analyzing.
  const loadVideos = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true)
      setError(null)
    }

    const { data: userData } = await supabase.auth.getUser()
    const user = userData?.user
    if (!user) {
      if (mountedRef.current) {
        setVideos([])
        setLoading(false)
      }
      return
    }

    const { data: videosData, error: vErr } = await supabase
      .from('videos')
      .select('id, title, file_name, file_url, cloudinary_public_id, game, status, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (vErr) {
      if (mountedRef.current && !silent) {
        setError(vErr.message)
        setLoading(false)
      }
      return
    }

    const videoIds = (videosData ?? []).map((v: any) => v.id)
    const { data: clipsData, error: cErr } = videoIds.length
      ? await supabase.from('clips').select('video_id, clip_url').in('video_id', videoIds)
      : { data: [], error: null }

    if (cErr) {
      if (mountedRef.current && !silent) {
        setError(cErr.message)
        setLoading(false)
      }
      return
    }

    const counts = new Map<string, number>()
    let cutCount = 0
    for (const c of clipsData ?? []) {
      const row = c as { video_id: string | number; clip_url: string | null }
      const vid = String(row.video_id)
      counts.set(vid, (counts.get(vid) ?? 0) + 1)
      if (row.clip_url) cutCount++
    }

    const mapped: VideoCardProps[] = (videosData ?? []).map((v: any) => {
      const id = String(v.id)
      // Prefer the stored title (set by upload/analyze from the real filename);
      // fall back to cleaning file_name for rows created before the title column.
      const displayTitle = (v.title && String(v.title).trim()) || cleanFilename(v.file_name)
      return {
        id,
        title: displayTitle,
        thumbnail: cloudinaryThumbnail(v.file_url),
        duration: '',
        status: normalizeStatus(v.status),
        clipsFound: counts.get(id) ?? 0,
        game: v.game || 'Unknown',
        createdAt: v.created_at || undefined,
      }
    })

    // For videos with no usable thumbnail, fall back to a client-side
    // first-frame capture from the source video.
    const sources: Record<string, string> = {}
    for (const v of videosData ?? []) {
      const id = String(v.id)
      if (cloudinaryThumbnail(v.file_url)) continue
      const src = pickVideoSrc(v.file_url, v.cloudinary_public_id)
      if (src) sources[id] = src
    }

    if (mountedRef.current) {
      setVideos(mapped)
      setStats({ clips: (clipsData ?? []).length, cut: cutCount })
      // Keep the previous object when nothing changed so the capture effect
      // doesn't re-run (and re-decode videos) on every background poll.
      setCaptureSources((prev) =>
        JSON.stringify(prev) === JSON.stringify(sources) ? prev : sources
      )
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadVideos()
  }, [loadVideos])

  // While any video is still analyzing, poll in the background so the card
  // flips to "Ready" (with its clip count) without a manual refresh.
  const hasProcessing = videos.some(
    (v) => v.status === 'processing' || v.status === 'rendering'
  )
  useEffect(() => {
    if (!hasProcessing) return
    const timer = setInterval(() => loadVideos(true), 8000)
    return () => clearInterval(timer)
  }, [hasProcessing, loadVideos])

  // Capture a first-frame thumbnail for videos whose `file_url` is a broken
  // Cloudinary "fetch" delivery URL, by seeking a hidden <video> to time 0
  // and drawing the frame to a <canvas>.
  useEffect(() => {
    const videoEl = captureVideoRef.current
    const canvas = captureCanvasRef.current
    const entries = Object.entries(captureSources)
    if (!videoEl || !canvas || entries.length === 0) return

    let cancelled = false

    async function run() {
      const ctx = canvas!.getContext('2d')
      if (!ctx) return
      canvas!.width = 320
      canvas!.height = 180

      for (const [id, src] of entries) {
        if (cancelled) return
        try {
          videoEl!.crossOrigin = 'anonymous'
          videoEl!.src = src
          await new Promise<void>((resolve, reject) => {
            videoEl!.onloadeddata = () => resolve()
            videoEl!.onerror = () => reject(new Error('Failed to load source video for thumbnail'))
          })
          if (cancelled) return
          ctx.drawImage(videoEl!, 0, 0, canvas!.width, canvas!.height)
          const dataUrl = canvas!.toDataURL('image/jpeg', 0.7)
          setCapturedThumbnails((prev) => ({ ...prev, [id]: dataUrl }))
        } catch (err) {
          console.error('[dashboard] thumbnail capture failed:', err)
        }
      }
    }

    run().catch((err) => console.error('[dashboard] thumbnail generation failed:', err))

    return () => {
      cancelled = true
    }
  }, [captureSources])

  const handleDelete = async (videoId: string) => {
    // Optimistic UI: drop the card immediately, restore on failure.
    const previous = videos
    setVideos((prev) => prev.filter((v) => v.id !== videoId))

    const { data: userData } = await supabase.auth.getUser()
    const user = userData?.user
    if (!user) {
      setVideos(previous)
      toast.error('You must be signed in to delete videos')
      return
    }

    // Confirm the video exists and belongs to this user before touching any
    // rows — otherwise the clip deletion below could run (and "succeed" with
    // zero rows) and we'd report success for a delete that never happened.
    const { data: owned } = await supabase
      .from('videos')
      .select('id')
      .eq('id', videoId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!owned) {
      setVideos(previous)
      toast.error('Video not found')
      return
    }

    // Remove dependent clip rows first so we do not orphan them.
    const { error: clipsErr } = await supabase
      .from('clips')
      .delete()
      .eq('video_id', videoId)

    if (clipsErr) {
      setVideos(previous)
      toast.error(`Failed to delete clips: ${clipsErr.message}`)
      return
    }

    const { error: vErr } = await supabase
      .from('videos')
      .delete()
      .eq('id', videoId)
      .eq('user_id', user.id)

    if (vErr) {
      setVideos(previous)
      toast.error(`Failed to delete video: ${vErr.message}`)
      return
    }

    toast.success('Video deleted')
  }

  const filteredVideos = videos.filter((video) => {
    const matchesSearch = video.title.toLowerCase().includes(search.toLowerCase())
    // "Processing" bucket covers both pre-analyze and active render states so
    // nothing falls through the cracks of the filter UI.
    const matchesFilter =
      filter === 'all' ||
      (filter === 'processing' &&
        (video.status === 'processing' || video.status === 'rendering')) ||
      (filter === 'ready' && video.status === 'ready')
    return matchesSearch && matchesFilter
  })

  const isEmpty = !loading && videos.length === 0

  return (
    <div className="mx-auto max-w-7xl">
      {/* Hidden elements used to capture first-frame thumbnails for videos
          whose `file_url` is a broken Cloudinary "fetch" delivery URL. */}
      <video ref={captureVideoRef} muted playsInline className="hidden" />
      <canvas ref={captureCanvasRef} className="hidden" />

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold">My Videos</h1>
          <p className="mt-1 text-muted-foreground">Manage your gaming footage and clips</p>
        </div>
        <Button className="shrink-0 border border-[var(--accent)] bg-[var(--surface)] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-[#0A0A0A] cursor-pointer" asChild>
          <Link href="/upload">
            <Upload className="mr-2 h-4 w-4" />
            Upload Video
          </Link>
        </Button>
      </motion.div>

      {loading ? (
        <DashboardSkeleton />
      ) : error ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-6 text-center">
          <p className="text-destructive">Failed to load videos: {error}</p>
        </div>
      ) : isEmpty ? (
        <FadeIn>
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 py-24">
          <div className="mb-6 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-4">
            <Film className="h-10 w-10 text-[var(--accent)]" />
          </div>
          <h2 className="mb-2 text-xl font-semibold">No videos yet</h2>
          <p className="mb-6 text-muted-foreground">Upload your first gaming clip to get started</p>
          <Button className="border border-[var(--accent)] bg-[var(--surface)] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-[#0A0A0A] cursor-pointer" asChild>
            <Link href="/upload">
              <Upload className="mr-2 h-4 w-4" />
              Upload Video
            </Link>
          </Button>
        </div>
        </FadeIn>
      ) : (
        <>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="mb-6 grid gap-4 sm:grid-cols-3"
          >
            <StatCard icon={Film} label="Videos in library" value={videos.length} />
            <StatCard icon={Sparkles} label="Highlights detected" value={stats.clips} />
            <StatCard icon={Scissors} label="Clips cut & ready" value={stats.cut} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search videos..."
                aria-label="Search videos"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-3">
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Videos</SelectItem>
                  <SelectItem value="ready">Ready</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex rounded-lg border border-border p-1">
                <Button
                  variant={view === 'grid' ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-8 w-8"
                  aria-label="Grid view"
                  aria-pressed={view === 'grid'}
                  onClick={() => setView('grid')}
                >
                  <Grid3x3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={view === 'list' ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-8 w-8"
                  aria-label="List view"
                  aria-pressed={view === 'list'}
                  onClick={() => setView('list')}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </motion.div>

          <StaggerContainer
            className={
              view === 'grid'
                ? 'grid gap-6 sm:grid-cols-2 xl:grid-cols-3'
                : 'flex flex-col gap-4'
            }
          >
            {filteredVideos.map((video) => (
              <StaggerItem key={video.id}>
                <HoverLift>
                  <VideoCard
                    {...video}
                    thumbnail={video.thumbnail || capturedThumbnails[video.id] || ''}
                    onDelete={handleDelete}
                  />
                </HoverLift>
              </StaggerItem>
            ))}
          </StaggerContainer>

          {filteredVideos.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-muted-foreground">No videos match your search</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
