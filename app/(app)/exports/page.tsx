'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Download,
  Trash2,
  MoreVertical,
  Play,
  Film,
  CheckCircle2,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { cleanFilename } from '@/lib/utils'

interface ExportedClip {
  id: string
  title: string
  thumbnail: string
  format: string
  exportedAt: string
  clipUrl: string | null
}

function formatRelative(iso: string | null | undefined): string {
  if (!iso) return ''
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''
  const diffMs = Date.now() - then
  const mins = Math.round(diffMs / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hours = Math.round(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  return `${days}d ago`
}

function ExportsSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="flex flex-col sm:flex-row">
            <Skeleton className="aspect-video w-full sm:aspect-auto sm:w-48" />
            <div className="flex flex-1 items-center justify-between p-4">
              <div className="space-y-2">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
              <Skeleton className="h-9 w-28" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function ExportsPage() {
  const [clips, setClips] = useState<ExportedClip[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)

      const { data: userData } = await supabase.auth.getUser()
      const user = userData?.user
      if (!user) {
        if (!cancelled) {
          setClips([])
          setLoading(false)
        }
        return
      }

      // Inner-join videos so we can filter by the parent video's user_id —
      // clips have no user_id column, ownership lives on the video row.
      const { data, error: err } = await supabase
        .from('clips')
        .select(
          'id, moment_type, clip_url, thumbnail_url, created_at, videos!inner(file_name, game, user_id)'
        )
        .eq('videos.user_id', user.id)
        .not('clip_url', 'is', null)
        .order('created_at', { ascending: false })

      if (cancelled) return

      if (err) {
        setError(err.message)
        setLoading(false)
        return
      }

      const mapped: ExportedClip[] = (data ?? []).map((row: any) => {
        const vid = Array.isArray(row.videos) ? row.videos[0] : row.videos
        const game = vid?.game || 'Clip'
        const filename = vid?.file_name ? cleanFilename(vid.file_name) : ''
        const moment = row.moment_type || 'clip'
        const title = filename ? `${game} — ${moment} (${filename})` : `${game} — ${moment}`
        return {
          id: String(row.id),
          title,
          thumbnail: row.thumbnail_url || '',
          format: moment,
          exportedAt: formatRelative(row.created_at),
          clipUrl: row.clip_url || null,
        }
      })

      setClips(mapped)
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  // Cloudinary URLs are cross-origin, so the `download` attribute on a plain
  // <a> is ignored and the browser just opens a new tab. Fetching the file
  // as a blob and downloading via an object URL keeps everything on this
  // page and saves the file to the user's downloads folder.
  const handleDownload = async (clip: ExportedClip) => {
    if (!clip.clipUrl) {
      toast.error('Download failed', { description: 'This clip has no file yet' })
      return
    }
    try {
      const res = await fetch(clip.clipUrl)
      if (!res.ok) throw new Error(`Download failed (${res.status})`)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${clip.format}_${clip.id}.mp4`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (e: any) {
      toast.error('Download failed', { description: e?.message || 'Could not download clip' })
    }
  }

  const handleDelete = async (id: string) => {
    const { error: err } = await supabase.from('clips').delete().eq('id', id)
    if (err) {
      toast.error(`Failed to delete: ${err.message}`)
      return
    }
    setClips((prev) => prev.filter((c) => c.id !== id))
    toast.success('Clip deleted')
  }

  return (
    <div className="mx-auto max-w-5xl">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold">Exported Clips</h1>
        <p className="mt-1 text-muted-foreground">
          Your rendered clips ready for download
        </p>
      </motion.div>

      {loading ? (
        <ExportsSkeleton />
      ) : error ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-6 text-center">
          <p className="text-destructive">Failed to load exports: {error}</p>
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
          <h2 className="mb-2 text-xl font-semibold">No exports yet</h2>
          <p className="text-muted-foreground">Cut clips from your videos to see them here</p>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="space-y-4"
        >
          {clips.map((clip, index) => (
            <motion.div
              key={clip.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="flex flex-col sm:flex-row">
                    <div className="relative aspect-video w-full shrink-0 bg-secondary sm:aspect-auto sm:w-48">
                      {clip.thumbnail ? (
                        <div
                          className="absolute inset-0 bg-cover bg-center"
                          style={{ backgroundImage: `url(${clip.thumbnail})` }}
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Film className="h-8 w-8 text-muted-foreground" />
                        </div>
                      )}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90">
                          <Play className="h-5 w-5 text-black" fill="black" />
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-1 flex-col justify-between p-4 sm:flex-row sm:items-center">
                      <div className="mb-4 min-w-0 sm:mb-0">
                        <h3 className="truncate font-semibold">{clip.title}</h3>
                        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                          <Badge variant="outline" className="capitalize">
                            {clip.format}
                          </Badge>
                          {clip.exportedAt && (
                            <span className="flex items-center gap-1">
                              <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                              {clip.exportedAt}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownload(clip)}
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Download
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Clip options">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDelete(clip.id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  )
}
