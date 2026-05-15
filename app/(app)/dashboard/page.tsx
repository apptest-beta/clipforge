'use client'

import { useState } from 'react'
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

const mockVideos: VideoCardProps[] = [
  {
    id: '1',
    title: 'Valorant Ranked Grind - Diamond Push',
    thumbnail: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&h=450&fit=crop',
    duration: '2:34:12',
    status: 'ready',
    clipsFound: 12,
    game: 'Valorant',
  },
  {
    id: '2',
    title: 'Fortnite Solo Victory Royale Streak',
    thumbnail: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=800&h=450&fit=crop',
    duration: '1:45:33',
    status: 'processing',
    progress: 47,
    game: 'Fortnite',
  },
  {
    id: '3',
    title: 'CS2 Competitive - Global Elite Games',
    thumbnail: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&h=450&fit=crop',
    duration: '3:12:05',
    status: 'ready',
    clipsFound: 18,
    game: 'CS2',
  },
  {
    id: '4',
    title: 'Apex Legends Season 20 Ranked',
    thumbnail: 'https://images.unsplash.com/photo-1552820728-8b83bb6b2b0d?w=800&h=450&fit=crop',
    duration: '2:08:44',
    status: 'rendering',
    clipsFound: 8,
    game: 'Apex Legends',
  },
  {
    id: '5',
    title: 'Minecraft Hardcore Survival Day 100',
    thumbnail: 'https://images.unsplash.com/photo-1587573089734-09cb69c0f2b4?w=800&h=450&fit=crop',
    duration: '4:22:18',
    status: 'ready',
    clipsFound: 24,
    game: 'Minecraft',
  },
  {
    id: '6',
    title: 'Warzone Rebirth Island Quads',
    thumbnail: 'https://images.unsplash.com/photo-1493711662062-fa541f7f3d24?w=800&h=450&fit=crop',
    duration: '1:55:30',
    status: 'processing',
    progress: 82,
    game: 'Warzone',
  },
]

export default function DashboardPage() {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [view, setView] = useState<'grid' | 'list'>('grid')

  const filteredVideos = mockVideos.filter((video) => {
    const matchesSearch = video.title.toLowerCase().includes(search.toLowerCase())
    const matchesFilter =
      filter === 'all' ||
      (filter === 'processing' && video.status === 'processing') ||
      (filter === 'ready' && video.status === 'ready')
    return matchesSearch && matchesFilter
  })

  const isEmpty = mockVideos.length === 0

  return (
    <div className="mx-auto max-w-7xl">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold">My Clips</h1>
          <p className="mt-1 text-muted-foreground">Manage your video recordings and clips</p>
        </div>
        <Button className="gradient-bg glow-hover shrink-0 text-white" asChild>
          <Link href="/upload">
            <Upload className="mr-2 h-4 w-4" />
            Upload Video
          </Link>
        </Button>
      </motion.div>

      {isEmpty ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 py-24"
        >
          <div className="gradient-bg mb-6 rounded-2xl p-4">
            <Film className="h-10 w-10 text-white" />
          </div>
          <h2 className="mb-2 text-xl font-semibold">No recordings yet</h2>
          <p className="mb-6 text-muted-foreground">Upload your first recording to get started</p>
          <Button className="gradient-bg text-white" asChild>
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
                <VideoCard {...video} />
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
