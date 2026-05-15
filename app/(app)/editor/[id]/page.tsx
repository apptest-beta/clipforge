'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Play,
  Pause,
  Download,
  Crosshair,
  Trophy,
  Laugh,
  Angry,
  Volume2,
  Maximize,
  SkipBack,
  SkipForward,
  Lock,
} from 'lucide-react'

const mockClips = [
  {
    id: '1',
    thumbnail: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400&h=225&fit=crop',
    type: 'kill',
    startTime: '2:34',
    endTime: '2:42',
    confidence: 94,
    selected: true,
  },
  {
    id: '2',
    thumbnail: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=400&h=225&fit=crop',
    type: 'clutch',
    startTime: '5:12',
    endTime: '5:28',
    confidence: 89,
    selected: true,
  },
  {
    id: '3',
    thumbnail: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=400&h=225&fit=crop',
    type: 'kill',
    startTime: '8:45',
    endTime: '8:52',
    confidence: 91,
    selected: false,
  },
  {
    id: '4',
    thumbnail: 'https://images.unsplash.com/photo-1552820728-8b83bb6b2b0d?w=400&h=225&fit=crop',
    type: 'funny',
    startTime: '12:03',
    endTime: '12:15',
    confidence: 78,
    selected: true,
  },
  {
    id: '5',
    thumbnail: 'https://images.unsplash.com/photo-1587573089734-09cb69c0f2b4?w=400&h=225&fit=crop',
    type: 'rage',
    startTime: '18:22',
    endTime: '18:35',
    confidence: 85,
    selected: false,
  },
  {
    id: '6',
    thumbnail: 'https://images.unsplash.com/photo-1493711662062-fa541f7f3d24?w=400&h=225&fit=crop',
    type: 'kill',
    startTime: '24:18',
    endTime: '24:26',
    confidence: 96,
    selected: true,
  },
  {
    id: '7',
    thumbnail: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400&h=225&fit=crop',
    type: 'clutch',
    startTime: '31:05',
    endTime: '31:22',
    confidence: 92,
    selected: true,
  },
  {
    id: '8',
    thumbnail: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=400&h=225&fit=crop',
    type: 'kill',
    startTime: '45:33',
    endTime: '45:40',
    confidence: 88,
    selected: false,
  },
]

const momentMarkers = [
  { position: 2, type: 'kill' },
  { position: 8, type: 'kill' },
  { position: 15, type: 'clutch' },
  { position: 25, type: 'funny' },
  { position: 38, type: 'rage' },
  { position: 52, type: 'kill' },
  { position: 68, type: 'clutch' },
  { position: 85, type: 'kill' },
]

const typeConfig = {
  kill: { label: 'Kill', color: 'bg-red-500', textColor: 'text-red-500', icon: Crosshair },
  clutch: { label: 'Clutch', color: 'bg-yellow-500', textColor: 'text-yellow-500', icon: Trophy },
  funny: { label: 'Funny', color: 'bg-blue-500', textColor: 'text-blue-500', icon: Laugh },
  rage: { label: 'Rage', color: 'bg-orange-500', textColor: 'text-orange-500', icon: Angry },
}

const exportFormats = [
  { value: 'tiktok', label: 'TikTok (9:16)' },
  { value: 'youtube', label: 'YouTube Shorts (9:16)' },
  { value: 'instagram', label: 'Instagram Reels (9:16)' },
  { value: 'landscape', label: 'Landscape (16:9)' },
]

export default function EditorPage() {
  const router = useRouter()
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(25)
  const [clips, setClips] = useState(mockClips)
  const [format, setFormat] = useState('tiktok')
  const [addCaptions, setAddCaptions] = useState(true)
  const [addMusic, setAddMusic] = useState(false)
  const [removeWatermark, setRemoveWatermark] = useState(false)

  const selectedCount = clips.filter((c) => c.selected).length

  const toggleClipSelection = (id: string) => {
    setClips((prev) =>
      prev.map((clip) => (clip.id === id ? { ...clip, selected: !clip.selected } : clip))
    )
  }

  const handleExport = () => {
    toast.success(`Exporting ${selectedCount} clips...`)
    setTimeout(() => {
      router.push('/exports')
    }, 1500)
  }

  return (
    <div className="mx-auto max-w-7xl">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold lg:text-3xl">Valorant Ranked Grind - Diamond Push</h1>
          <p className="mt-1 text-muted-foreground">
            {clips.length} moments detected • Duration: 2:34:12
          </p>
        </div>
      </motion.div>

      <div className="grid gap-6 xl:grid-cols-[1fr,320px]">
        <div className="space-y-6">
          {/* Video Player */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="overflow-hidden">
              <div className="relative aspect-video bg-black">
                <div
                  className="absolute inset-0 bg-cover bg-center"
                  style={{
                    backgroundImage:
                      'url(https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200&h=675&fit=crop)',
                  }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-16 w-16 rounded-full bg-black/50 text-white backdrop-blur-sm hover:bg-black/70"
                    onClick={() => setIsPlaying(!isPlaying)}
                  >
                    {isPlaying ? (
                      <Pause className="h-8 w-8" fill="white" />
                    ) : (
                      <Play className="h-8 w-8" fill="white" />
                    )}
                  </Button>
                </div>

                {/* Video Controls */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                  {/* Timeline with markers */}
                  <div className="relative mb-3 h-2">
                    <div className="absolute inset-0 rounded-full bg-white/20" />
                    <div
                      className="gradient-bg absolute left-0 top-0 h-full rounded-full"
                      style={{ width: `${currentTime}%` }}
                    />
                    {momentMarkers.map((marker, i) => {
                      const config = typeConfig[marker.type as keyof typeof typeConfig]
                      return (
                        <div
                          key={i}
                          className={`absolute top-1/2 h-3 w-3 -translate-y-1/2 cursor-pointer rounded-full ${config.color} ring-2 ring-white/50 transition-transform hover:scale-125`}
                          style={{ left: `${marker.position}%` }}
                          title={`${config.label} at ${marker.position}%`}
                        />
                      )
                    })}
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={currentTime}
                      onChange={(e) => setCurrentTime(Number(e.target.value))}
                      className="absolute inset-0 cursor-pointer opacity-0"
                    />
                  </div>

                  <div className="flex items-center justify-between text-white">
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/20">
                        <SkipBack className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-white hover:bg-white/20"
                        onClick={() => setIsPlaying(!isPlaying)}
                      >
                        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/20">
                        <SkipForward className="h-4 w-4" />
                      </Button>
                      <span className="ml-2 text-sm">0:38:45 / 2:34:12</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/20">
                        <Volume2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/20">
                        <Maximize className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Timeline legend */}
              <CardContent className="border-t border-border p-3">
                <div className="flex flex-wrap items-center gap-4">
                  <span className="text-sm text-muted-foreground">Moment types:</span>
                  {Object.entries(typeConfig).map(([key, config]) => (
                    <div key={key} className="flex items-center gap-1.5">
                      <div className={`h-2.5 w-2.5 rounded-full ${config.color}`} />
                      <span className="text-sm">{config.label}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Clips Grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Detected Clips ({clips.length})</h2>
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
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {clips.map((clip, index) => {
                const config = typeConfig[clip.type as keyof typeof typeConfig]
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
                      <div className="relative aspect-video overflow-hidden">
                        <div
                          className="absolute inset-0 bg-cover bg-center transition-transform duration-300 group-hover:scale-105"
                          style={{ backgroundImage: `url(${clip.thumbnail})` }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity group-hover:opacity-100">
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
                        <Badge
                          className={`absolute right-2 top-2 ${config.color} border-0 text-white`}
                        >
                          <Icon className="mr-1 h-3 w-3" />
                          {config.label}
                        </Badge>
                      </div>
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">
                            {clip.startTime} - {clip.endTime}
                          </span>
                          <span className="text-xs text-muted-foreground">{clip.confidence}%</span>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )
              })}
            </div>
          </motion.div>
        </div>

        {/* Export Sidebar */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-4"
        >
          <Card className="sticky top-24">
            <CardHeader>
              <CardTitle>Export Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Format</Label>
                <Select value={format} onValueChange={setFormat}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {exportFormats.map((f) => (
                      <SelectItem key={f.value} value={f.value}>
                        {f.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="captions" className="cursor-pointer">
                    Add captions
                  </Label>
                  <Switch
                    id="captions"
                    checked={addCaptions}
                    onCheckedChange={setAddCaptions}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="music" className="cursor-pointer">
                    Add music
                  </Label>
                  <Switch id="music" checked={addMusic} onCheckedChange={setAddMusic} />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="watermark" className="cursor-pointer">
                      Remove watermark
                    </Label>
                    <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <Switch
                    id="watermark"
                    checked={removeWatermark}
                    onCheckedChange={setRemoveWatermark}
                    disabled
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  <Button variant="link" className="h-auto p-0 text-xs" asChild>
                    <a href="#pricing">Upgrade to remove watermark</a>
                  </Button>
                </p>
              </div>

              <div className="border-t border-border pt-4">
                <div className="mb-4 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Selected clips</span>
                  <span className="font-medium">{selectedCount}</span>
                </div>
                <Button
                  onClick={handleExport}
                  disabled={selectedCount === 0}
                  className="gradient-bg glow w-full text-white"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Export Selected ({selectedCount})
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
