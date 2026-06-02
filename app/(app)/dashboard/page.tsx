'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
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
import { Upload, Search, Grid3x3, List, Film } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { supabase } from '@/lib/supabase'
import { cleanFilename } from '@/lib/utils'
import { toast } from 'sonner'

// Turn a Cloudinary video URL into a first-frame JPG thumbnail.
// Inserts so_0 (start offset 0s) and swaps the video extension for .jpg.
function cloudinaryThumbnail(url: string | null | undefined): string {
  if (!url) return ''
  return url
    .replace('/video/upload/', '/video/upload/so_0/')
    .replace(/\.(mp4|mov|webm|mkv|avi)(\?|$)/i, '.jpg$2')
}

function normalizeStatus(status: string | null | undefined): VideoCardProps['status'] {
  if (status === 'processing' || status === 'rendering') return status
  return 'ready'
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
            <Skeleton className="aspect-video w-full" />
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

  useEffect(() => {
    let cancelled = false

    async function loadVideos() {
      setLoading(true)
      setError(null)

      const { data: userData } = await supabase.auth.getUser()
      const user = userData?.user
      if (!user) {
        if (!cancelled) {
          setVideos([])
          setLoading(false)
        }
        return
      }

      const { data: videosData, error: vErr } = await supabase
        .from('videos')
        .select('id, title, file_name, file_url, game, status, created_at')
        .eq('user_id', user.id)

      if (vErr) {
        if (!cancelled) {
          setError(vErr.message)
          setLoading(false)
        }
        return
      }

      const videoIds = (videosData ?? []).map((v: any) => v.id)
      const { data: clipsData, error: cErr } = videoIds.length
        ? await supabase.from('clips').select('video_id').in('video_id', videoIds)
        : { data: [], error: null }

      if (cErr) {
        if (!cancelled) {
          setError(cErr.message)
          setLoading(false)
        }
        return
      }

      const counts = new Map<string, number>()
      for (const c of clipsData ?? []) {
        const vid = String((c as { video_id: string | number }).video_id)
        counts.set(vid, (counts.get(vid) ?? 0) + 1)
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

      if (!cancelled) {
        setVideos(mapped)
        setLoading(false)
      }
    }

    loadVideos()
    return () => {
      cancelled = true
    }
  }, [])

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
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold">My Videos</h1>
          <p className="mt-1 text-muted-foreground">Manage your gaming footage and clips</p>
        </div>
        <Button className="shrink-0 border border-[#E8FF47] bg-[#1A1A1A] text-[#E8FF47] hover:bg-[#E8FF47] hover:text-[#0D0D0D] cursor-pointer" asChild>
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
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 py-24"
        >
          <div className="gradient-bg mb-6 rounded-2xl p-4">
            <Film className="h-10 w-10 text-white" />
          </div>
          <h2 className="mb-2 text-xl font-semibold">No videos yet</h2>
          <p className="mb-6 text-muted-foreground">Upload your first gaming clip to get started</p>
          <Button className="border border-[#E8FF47] bg-[#1A1A1A] text-[#E8FF47] hover:bg-[#E8FF47] hover:text-[#0D0D0D] cursor-pointer" asChild>
            <Link href="/upload">
              <Upload className="mr-2 h-4 w-4" />
              Upload Video
            </Link>
          </Button>
        </motion.div>
      ) : (
        <>
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
                  onClick={() => setView('grid')}
                >
                  <Grid3x3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={view === 'list' ? 'secondary' : 'ghost'}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setView('list')}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className={
              view === 'grid'
                ? 'grid gap-6 sm:grid-cols-2 xl:grid-cols-3'
                : 'flex flex-col gap-4'
            }
          >
            {filteredVideos.map((video, index) => (
              <motion.div
                key={video.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <VideoCard {...video} onDelete={handleDelete} />
              </motion.div>
            ))}
          </motion.div>

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
