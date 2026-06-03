'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Download,
  Crosshair,
  Trophy,
  Laugh,
  Angry,
  Sparkles,
  Film,
  Play,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { cleanFilename } from '@/lib/utils'

interface EditorClip {
  id: string
  thumbnail: string
  moment_type: string
  start_time: number | null
  end_time: number | null
  score: number | null
  clip_url: string | null
  selected: boolean
}

interface EditorVideo {
  id: string
  file_name: string | null
  game: string | null
}

const typeConfig: Record<string, { label: string; color: string; icon: any }> = {
  kill: { label: 'Kill', color: 'bg-red-500', icon: Crosshair },
  clutch: { label: 'Clutch', color: 'bg-yellow-500', icon: Trophy },
  funny: { label: 'Funny', color: 'bg-blue-500', icon: Laugh },
  rage: { label: 'Rage', color: 'bg-orange-500', icon: Angry },
}

function configFor(type: string) {
  const key = (type || '').toLowerCase()
  return typeConfig[key] || { label: type || 'Moment', color: 'bg-primary', icon: Sparkles }
}

function formatSeconds(s: number | null | undefined): string {
  if (s == null || Number.isNaN(s)) return '--:--'
  const total = Math.max(0, Math.round(s))
  const m = Math.floor(total / 60)
  const sec = total % 60
  return `${m}:${sec.toString().padStart(2, '0')}`
}

function EditorSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-2/3" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-xl border border-border bg-card">
            <Skeleton className="aspect-video w-full" />
            <div className="space-y-2 p-3">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function EditorPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const videoId = params?.id ? String(params.id) : ''

  const [video, setVideo] = useState<EditorVideo | null>(null)
  const [clips, setClips] = useState<EditorClip[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [exportingIds, setExportingIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    let cancelled = false

    async function load() {
      if (!videoId) {
        setError('Missing video id')
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)

      const { data: vData, error: vErr } = await supabase
        .from('videos')
        .select('id, file_name, game')
        .eq('id', videoId)
        .single()

      if (cancelled) return

      if (vErr) {
        setError(vErr.message)
        setLoading(false)
        return
      }

      const { data: cData, error: cErr } = await supabase
        .from('clips')
        .select('id, moment_type, start_time, end_time, score, thumbnail_url, clip_url')
        .eq('video_id', videoId)
        .order('start_time', { ascending: true })

      if (cancelled) return

      if (cErr) {
        setError(cErr.message)
        setLoading(false)
        return
      }

      const mapped: EditorClip[] = (cData ?? []).map((row: any) => ({
        id: String(row.id),
        thumbnail: row.thumbnail_url || '',
        moment_type: row.moment_type || 'moment',
        start_time: row.start_time ?? null,
        end_time: row.end_time ?? null,
        score: row.score ?? null,
        clip_url: row.clip_url || null,
        selected: Boolean(row.clip_url),
      }))

      setVideo(vData as EditorVideo)
      setClips(mapped)
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [videoId])

  const selectedCount = clips.filter((c) => c.selected).length
  const readyCount = clips.filter((c) => c.clip_url).length

  const toggleClipSelection = (id: string) => {
    setClips((prev) =>
      prev.map((clip) => (clip.id === id ? { ...clip, selected: !clip.selected } : clip))
    )
  }

  const handleExportOne = (clipId: string) => {
    const clip = clips.find((c) => c.id === clipId)
    if (!clip) return
    if (!clip.clip_url) {
      toast.error('This clip has not been cut yet. Open it in Clips and run Cut Clip first.')
      return
    }
    setExportingIds((prev) => new Set(prev).add(clipId))
    toast.success(`Downloading ${configFor(clip.moment_type).label}...`)
    const a = document.createElement('a')
    a.href = `/api/export?clip_id=${encodeURIComponent(clipId)}`
    a.rel = 'noopener'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => {
      setExportingIds((prev) => {
        const next = new Set(prev)
        next.delete(clipId)
        return next
      })
    }, 1500)
  }

  const handleExportSelected = () => {
    const selected = clips.filter((c) => c.selected && c.clip_url)
    if (selected.length === 0) {
      toast.error('Select at least one clip that has been cut.')
      return
    }
    selected.forEach((clip, i) => {
      // Stagger downloads slightly so the browser opens each one.
      setTimeout(() => handleExportOne(clip.id), i * 400)
    })
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl">
        <EditorSkeleton />
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto max-w-7xl">
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-6 text-center">
          <p className="text-destructive">Failed to load video: {error}</p>
          <Button variant="outline" className="mt-4" onClick={() => router.push('/dashboard')}>
            Back to dashboard
          </Button>
        </div>
      </div>
    )
  }

  const title = video?.file_name ? cleanFilename(video.file_name) : 'Untitled video'
  const game = video?.game || 'Unknown'

  return (
    <div className="mx-auto max-w-7xl">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"
      >
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold lg:text-3xl">{title}</h1>
          <p className="mt-1 text-muted-foreground">
            {game} • {clips.length} moments • {readyCount} cut
          </p>
        </div>
        <Button variant="outline" onClick={() => router.push(`/clips/${videoId}`)}>
          Open clip workspace
        </Button>
      </motion.div>

      <div className="grid gap-6 xl:grid-cols-[1fr,320px]">
        {/* Clips Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Detected Clips ({clips.length})</h2>
            {clips.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const allSelected = clips.every((c) => c.selected)
                  setClips((prev) => prev.map((c) => ({ ...c, selected: !allSelected })))
                }}
              >
                {clips.every((c) => c.selected) ? 'Deselect All' : 'Select All'}
              </Button>
            )}
          </div>

          {clips.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 py-16">
              <Film className="mb-4 h-10 w-10 text-muted-foreground" />
              <p className="text-muted-foreground">No clips detected for this video yet.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
              {clips.map((clip, index) => {
                const config = configFor(clip.moment_type)
                const Icon = config.icon
                return (
                  <motion.div
                    key={clip.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card
                      className={`group cursor-pointer overflow-hidden transition-all hover:-translate-y-1 ${
                        clip.selected ? 'ring-2 ring-primary' : ''
                      }`}
                      onClick={() => toggleClipSelection(clip.id)}
                    >
                      <div className="relative aspect-video overflow-hidden bg-secondary">
                        {clip.thumbnail ? (
                          <div
                            className="absolute inset-0 bg-cover bg-center transition-transform duration-300 group-hover:scale-105"
                            style={{ backgroundImage: `url(${clip.thumbnail})` }}
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Film className="h-8 w-8 text-muted-foreground" />
                          </div>
                        )}
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition-opacity group-hover:opacity-100">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90">
                            <Play className="h-5 w-5 text-black" fill="black" />
                          </div>
                        </div>
                        <div className="absolute left-2 top-2">
                          <Checkbox
                            checked={clip.selected}
                            className="h-5 w-5 border-2 border-white bg-black/50 data-[state=checked]:bg-primary"
                            onClick={(e) => e.stopPropagation()}
                            onCheckedChange={() => toggleClipSelection(clip.id)}
                          />
                        </div>
                        <Badge className={`absolute right-2 top-2 ${config.color} border-0 text-white`}>
                          <Icon className="mr-1 h-3 w-3" />
                          {config.label}
                        </Badge>
                      </div>
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">
                            {formatSeconds(clip.start_time)} – {formatSeconds(clip.end_time)}
                          </span>
                          {clip.score != null && (
                            <span className="text-xs text-muted-foreground">
                              {Math.round(clip.score)}%
                            </span>
                          )}
                        </div>
                        <div className="mt-3 flex items-center justify-between">
                          {clip.clip_url ? (
                            <Badge variant="outline" className="border-green-500/30 bg-green-500/10 text-green-500">
                              Ready
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-yellow-500/30 bg-yellow-500/10 text-yellow-500">
                              Not cut
                            </Badge>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={!clip.clip_url || exportingIds.has(clip.id)}
                            onClick={(e) => {
                              e.stopPropagation()
                              handleExportOne(clip.id)
                            }}
                          >
                            <Download className="mr-2 h-4 w-4" />
                            Export
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )
              })}
            </div>
          )}
        </motion.div>

        {/* Export Sidebar */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-4"
        >
          <Card className="sticky top-24">
            <CardHeader>
              <CardTitle>Batch Export</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Selected</span>
                <span className="font-medium">{selectedCount}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Cut and ready</span>
                <span className="font-medium">{readyCount}</span>
              </div>
              <Button
                onClick={handleExportSelected}
                disabled={selectedCount === 0}
                className="gradient-bg w-full text-white"
              >
                <Download className="mr-2 h-4 w-4" />
                Export Selected ({selectedCount})
              </Button>
              <p className="text-xs text-muted-foreground">
                Clips marked &quot;Not cut&quot; need to be cut in the workspace first.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
