'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Download,
  Share2,
  Trash2,
  MoreVertical,
  Play,
  Clock,
  Film,
  Link as LinkIcon,
  CheckCircle2,
  Copy,
} from 'lucide-react'

interface ExportedClip {
  id: string
  title: string
  thumbnail: string
  duration: string
  format: string
  size: string
  exportedAt: string
  selected: boolean
}

const mockExports: ExportedClip[] = [
  {
    id: '1',
    title: 'Valorant 1v4 Clutch',
    thumbnail: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400&h=225&fit=crop',
    duration: '0:14',
    format: 'TikTok (9:16)',
    size: '12.4 MB',
    exportedAt: '2 hours ago',
    selected: false,
  },
  {
    id: '2',
    title: 'Triple Kill Spray Transfer',
    thumbnail: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=400&h=225&fit=crop',
    duration: '0:08',
    format: 'YouTube Shorts',
    size: '8.2 MB',
    exportedAt: '2 hours ago',
    selected: false,
  },
  {
    id: '3',
    title: 'Rage Moment Compilation',
    thumbnail: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=400&h=225&fit=crop',
    duration: '0:22',
    format: 'Instagram Reels',
    size: '18.7 MB',
    exportedAt: '5 hours ago',
    selected: false,
  },
  {
    id: '4',
    title: 'Funny Team Kill',
    thumbnail: 'https://images.unsplash.com/photo-1552820728-8b83bb6b2b0d?w=400&h=225&fit=crop',
    duration: '0:11',
    format: 'TikTok (9:16)',
    size: '9.1 MB',
    exportedAt: '1 day ago',
    selected: false,
  },
  {
    id: '5',
    title: 'Ace Compilation',
    thumbnail: 'https://images.unsplash.com/photo-1587573089734-09cb69c0f2b4?w=400&h=225&fit=crop',
    duration: '0:45',
    format: 'Landscape (16:9)',
    size: '34.2 MB',
    exportedAt: '2 days ago',
    selected: false,
  },
  {
    id: '6',
    title: 'Best Kills of the Week',
    thumbnail: 'https://images.unsplash.com/photo-1493711662062-fa541f7f3d24?w=400&h=225&fit=crop',
    duration: '1:02',
    format: 'YouTube Shorts',
    size: '42.8 MB',
    exportedAt: '3 days ago',
    selected: false,
  },
]

export default function ExportsPage() {
  const [clips, setClips] = useState(mockExports)

  const selectedCount = clips.filter((c) => c.selected).length
  const allSelected = clips.length > 0 && clips.every((c) => c.selected)

  const toggleSelection = (id: string) => {
    setClips((prev) =>
      prev.map((clip) => (clip.id === id ? { ...clip, selected: !clip.selected } : clip))
    )
  }

  const toggleAll = () => {
    setClips((prev) => prev.map((clip) => ({ ...clip, selected: !allSelected })))
  }

  const handleDownload = (clipTitle: string) => {
    toast.success(`Downloading ${clipTitle}...`)
  }

  const handleCopyLink = (clipTitle: string) => {
    navigator.clipboard.writeText(`https://clipforge.app/share/${clipTitle.toLowerCase().replace(/\s/g, '-')}`)
    toast.success('Link copied to clipboard!')
  }

  const handleDelete = (id: string) => {
    setClips((prev) => prev.filter((clip) => clip.id !== id))
    toast.success('Clip deleted')
  }

  const handleBatchDownload = () => {
    toast.success(`Downloading ${selectedCount} clips...`)
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
          Your rendered clips ready for download and sharing
        </p>
      </motion.div>

      {clips.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 py-24"
        >
          <div className="gradient-bg mb-6 rounded-2xl p-4">
            <Film className="h-10 w-10 text-white" />
          </div>
          <h2 className="mb-2 text-xl font-semibold">No exports yet</h2>
          <p className="text-muted-foreground">Export clips from the editor to see them here</p>
        </motion.div>
      ) : (
        <>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-center gap-3">
              <Checkbox
                checked={allSelected}
                onCheckedChange={toggleAll}
                aria-label="Select all clips"
              />
              <span className="text-sm text-muted-foreground">
                {selectedCount > 0 ? `${selectedCount} selected` : `${clips.length} clips`}
              </span>
            </div>
            {selectedCount > 0 && (
              <Button onClick={handleBatchDownload} className="gradient-bg text-white">
                <Download className="mr-2 h-4 w-4" />
                Download All ({selectedCount})
              </Button>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="space-y-4"
          >
            {clips.map((clip, index) => (
              <motion.div
                key={clip.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card
                  className={`overflow-hidden transition-all ${
                    clip.selected ? 'ring-2 ring-primary' : ''
                  }`}
                >
                  <CardContent className="p-0">
                    <div className="flex flex-col sm:flex-row">
                      {/* Thumbnail */}
                      <div className="relative aspect-video w-full shrink-0 sm:aspect-auto sm:w-48">
                        <div
                          className="absolute inset-0 bg-cover bg-center"
                          style={{ backgroundImage: `url(${clip.thumbnail})` }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90">
                            <Play className="h-5 w-5 text-black" fill="black" />
                          </div>
                        </div>
                        <div className="absolute bottom-2 right-2">
                          <Badge
                            variant="secondary"
                            className="bg-black/70 text-white backdrop-blur-sm"
                          >
                            <Clock className="mr-1 h-3 w-3" />
                            {clip.duration}
                          </Badge>
                        </div>
                        <div className="absolute left-2 top-2">
                          <Checkbox
                            checked={clip.selected}
                            onCheckedChange={() => toggleSelection(clip.id)}
                            className="h-5 w-5 border-2 border-white bg-black/50 data-[state=checked]:bg-primary"
                          />
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex flex-1 flex-col justify-between p-4 sm:flex-row sm:items-center">
                        <div className="mb-4 min-w-0 sm:mb-0">
                          <h3 className="truncate font-semibold">{clip.title}</h3>
                          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                            <span>{clip.format}</span>
                            <span>{clip.size}</span>
                            <span className="flex items-center gap-1">
                              <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                              {clip.exportedAt}
                            </span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownload(clip.title)}
                          >
                            <Download className="mr-2 h-4 w-4" />
                            Download
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCopyLink(clip.title)}
                          >
                            <LinkIcon className="mr-2 h-4 w-4" />
                            Share
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleCopyLink(clip.title)}>
                                <Copy className="mr-2 h-4 w-4" />
                                Copy link
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDownload(clip.title)}>
                                <Share2 className="mr-2 h-4 w-4" />
                                Share to social
                              </DropdownMenuItem>
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
        </>
      )}
    </div>
  )
}
