'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Play, Film, Clock, MoreVertical, Trash2, Edit } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export interface VideoCardProps {
  id: string
  title: string
  thumbnail: string
  duration: string
  status: 'processing' | 'ready' | 'rendering'
  progress?: number
  clipsFound?: number
  game: string
}

export function VideoCard({
  id,
  title,
  thumbnail,
  duration,
  status,
  progress = 0,
  clipsFound,
  game,
}: VideoCardProps) {
  const statusConfig = {
    processing: {
      label: `Processing ${progress}%`,
      color: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30',
    },
    ready: {
      label: 'Ready',
      color: 'bg-green-500/20 text-green-500 border-green-500/30',
    },
    rendering: {
      label: 'Rendering',
      color: 'bg-blue-500/20 text-blue-500 border-blue-500/30',
    },
  }

  const { label, color } = statusConfig[status]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="group overflow-hidden transition-all glow-hover">
        <div className="relative aspect-video overflow-hidden bg-secondary">
          <div
            className="absolute inset-0 bg-cover bg-center transition-transform duration-300 group-hover:scale-105"
            style={{ backgroundImage: `url(${thumbnail})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
          
          {status === 'ready' && (
            <Link
              href={`/editor/${id}`}
              className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100"
            >
              <div className="gradient-bg flex h-14 w-14 items-center justify-center rounded-full shadow-lg">
                <Play className="h-6 w-6 text-white" fill="white" />
              </div>
            </Link>
          )}

          {status === 'processing' && (
            <div className="absolute bottom-0 left-0 right-0 p-3">
              <Progress value={progress} className="h-1.5" />
            </div>
          )}

          <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
            <Badge variant="outline" className="border-white/20 bg-black/50 text-white backdrop-blur-sm">
              {game}
            </Badge>
            <Badge variant="outline" className="border-white/20 bg-black/50 text-white backdrop-blur-sm">
              <Clock className="mr-1 h-3 w-3" />
              {duration}
            </Badge>
          </div>
        </div>

        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h3 className="truncate font-semibold">{title}</h3>
              <div className="mt-1 flex items-center gap-3">
                <Badge variant="outline" className={color}>
                  {label}
                </Badge>
                {clipsFound !== undefined && status === 'ready' && (
                  <span className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Film className="h-3.5 w-3.5" />
                    {clipsFound} clips found
                  </span>
                )}
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href={`/editor/${id}`}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Clips
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem className="text-destructive">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
