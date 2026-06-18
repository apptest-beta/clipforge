'use client'
import { useState, useCallback } from 'react'
import { genUploader } from 'uploadthing/client'
import type { OurFileRouter } from '@/app/api/uploadthing/core'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Upload,
  FileVideo,
  X,
  ChevronDown,
  Loader2,
  Sparkles,
  Crosshair,
  Skull,
  Trophy,
  Laugh,
  Angry,
  Ghost,
} from 'lucide-react'

const games = [
  { value: 'valorant', label: 'Valorant' },
  { value: 'cs2', label: 'CS2' },
  { value: 'fortnite', label: 'Fortnite' },
  { value: 'apex', label: 'Apex Legends' },
  { value: 'cod', label: 'Call of Duty' },
  { value: 'minecraft', label: 'Minecraft' },
  { value: 'rocket-league', label: 'Rocket League' },
  { value: 'gta-v', label: 'GTA V' },
  { value: 'other', label: 'Other' },
]

const momentTypes = [
  { id: 'kills', label: 'Kills', icon: Crosshair, color: 'text-[#E85D5D]' },
  { id: 'deaths', label: 'Deaths', icon: Skull, color: 'text-[#888888]' },
  { id: 'clutches', label: 'Clutches', icon: Trophy, color: 'text-[#F97316]' },
  { id: 'funny', label: 'Funny Moments', icon: Laugh, color: 'text-[#60A5FA]' },
  { id: 'rage', label: 'Rage', icon: Angry, color: 'text-[#E8A838]' },
  { id: 'jumpscares', label: 'Jump Scares', icon: Ghost, color: 'text-[#F97316]' },
]

const { uploadFiles } = genUploader<OurFileRouter>()

export default function UploadPage() {
  const router = useRouter()
  const [isDragging, setIsDragging] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [game, setGame] = useState('')
  const [selectedMoments, setSelectedMoments] = useState<string[]>(['kills', 'clutches', 'funny'])
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [statusLabel, setStatusLabel] = useState('Uploading...')

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile && isValidFile(droppedFile)) {
      setFile(droppedFile)
    } else {
      toast.error('Invalid file type. Please upload MP4, MOV, WEBM, MKV, or AVI files.')
    }
  }, [])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile && isValidFile(selectedFile)) {
      setFile(selectedFile)
    } else if (selectedFile) {
      toast.error('Invalid file type. Please upload MP4, MOV, WEBM, MKV, or AVI files.')
    }
  }, [])

  const isValidFile = (file: File) => {
    // Keep this in sync with the rest of the pipeline - the cut + analyze
    // routes already handle .webm and .mkv, so accept them at the gate too.
    const validTypes = [
      'video/mp4',
      'video/quicktime',
      'video/x-msvideo',
      'video/avi',
      'video/webm',
      'video/x-matroska',
    ]
    return validTypes.includes(file.type) || /\.(mp4|mov|avi|webm|mkv)$/i.test(file.name)
  }

  const formatFileSize = (bytes: number) => {
    if (bytes >= 1073741824) return (bytes / 1073741824).toFixed(2) + ' GB'
    if (bytes >= 1048576) return (bytes / 1048576).toFixed(2) + ' MB'
    return (bytes / 1024).toFixed(2) + ' KB'
  }

  const handleMomentToggle = (momentId: string) => {
    setSelectedMoments((prev) =>
      prev.includes(momentId) ? prev.filter((id) => id !== momentId) : [...prev, momentId]
    )
  }

  const handleUpload = async () => {
    if (!file || !game) {
      toast.error('Please select a file and game')
      return
    }

    setIsUploading(true)
    setUploadProgress(0)
    setStatusLabel('Uploading...')

    try {
      // Step 1: Upload to Uploadthing
      const uploaded = await uploadFiles('videoUploader', {
        files: [file],
        onUploadProgress: ({ progress }) => {
          // Scale upload progress to 0–50% so the remaining 50% is for analysis
          setUploadProgress(Math.round(progress * 0.5))
        },
      })

      const fileUrl = uploaded[0]?.serverData?.url ?? uploaded[0]?.ufsUrl
      if (!fileUrl) throw new Error('Upload succeeded but no URL returned')

      setUploadProgress(50)
      setStatusLabel('Analyzing with AI...')

      const effectiveGame = game || 'other'
      const analyzePayload = {
        fileName: file.name,
        fileUrl,
        game: effectiveGame,
        momentTypes: selectedMoments,
      }
      // Fake progress tick: nudge from 50% toward 95% every 2s while analysis runs
      let fakePct = 50
      const ticker = setInterval(() => {
        fakePct = Math.min(95, fakePct + 3)
        setUploadProgress(fakePct)
      }, 2000)

      // Step 2: Send to analyze API with the Uploadthing URL
      let response: Response | undefined
      try {
        response = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(analyzePayload),
        })
      } finally {
        clearInterval(ticker)
      }

      if (!response || !response.ok) {
        const errJson = response ? await response.json().catch(() => ({})) : {}
        throw new Error((errJson as { error?: string }).error || `Analysis failed (${response?.status ?? 'no response'})`)
      }

      await response.json()
      setUploadProgress(100)
      setStatusLabel('Done! Redirecting...')
      toast.success('Analysis complete!')
      setTimeout(() => router.push('/dashboard'), 1500)
    } catch (error) {
      console.error('Upload error:', error)
      toast.error(error instanceof Error ? error.message : 'Upload failed. Please try again.')
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  const removeFile = () => {
    setFile(null)
    setUploadProgress(0)
    setIsUploading(false)
  }

  return (
    <div className="mx-auto max-w-3xl">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold">Upload Video</h1>
        <p className="mt-1 text-muted-foreground">
          Upload your gaming footage and let AI find the best moments
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="gradient-border overflow-hidden">
          <CardContent className="p-6">
            <AnimatePresence mode="wait">
              {!file ? (
                <motion.div
                  key="dropzone"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  style={{
                    borderColor: isDragging ? '#F97316' : '#2A2A2A',
                    background: isDragging ? 'rgba(249,115,22,0.05)' : 'transparent',
                  }}
                  className="relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-12 transition-all"
                >
                  <input
                    type="file"
                    accept=".mp4,.mov,.avi,.webm,.mkv,video/mp4,video/quicktime,video/x-msvideo,video/webm,video/x-matroska"
                    onChange={handleFileSelect}
                    className="absolute inset-0 cursor-pointer opacity-0"
                  />
                  <motion.div
                    animate={{ y: isDragging ? -10 : 0 }}
                    className="mb-6 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-4"
                  >
                    <Upload className="h-10 w-10 text-[var(--accent)]" />
                  </motion.div>
                  <h3 className="mb-2 text-xl font-semibold">
                    {isDragging ? 'Drop your file here' : 'Drop your recording here'}
                  </h3>
                  <p className="mb-6 text-muted-foreground">or click to browse files</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    <Badge variant="outline">.mp4</Badge>
                    <Badge variant="outline">.mov</Badge>
                    <Badge variant="outline">.webm</Badge>
                    <Badge variant="outline">.mkv</Badge>
                    <Badge variant="outline">.avi</Badge>
                    <Badge variant="outline">up to 2GB</Badge>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="file-preview"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="rounded-xl border border-border bg-secondary/30 p-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)]">
                      <FileVideo className="h-7 w-7 text-[var(--accent)]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{file.name}</p>
                      <p className="text-sm text-muted-foreground">{formatFileSize(file.size)}</p>
                    </div>
                    {!isUploading && (
                      <Button variant="ghost" size="icon" onClick={removeFile} className="shrink-0" aria-label="Remove file">
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  {isUploading && (
                    <div className="mt-4">
                      <div className="mb-2 flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{statusLabel}</span>
                        <span className="font-medium">{Math.round(uploadProgress)}%</span>
                      </div>
                      <Progress value={uploadProgress} className="h-2" />
                      <p className="mt-2 text-xs text-muted-foreground">
                        {uploadProgress < 50 ? 'Uploading to storage...' : 'Running AI analysis...'}
                      </p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mt-6"
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Game Selection</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={game} onValueChange={setGame}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select the game you were playing" />
              </SelectTrigger>
              <SelectContent>
                {games.map((g) => (
                  <SelectItem key={g.value} value={g.value}>
                    {g.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mt-6"
      >
        <Collapsible open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer transition-colors hover:bg-secondary/50">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Advanced Settings</CardTitle>
                  <motion.div
                    animate={{ rotate: isAdvancedOpen ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  </motion.div>
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <div className="space-y-4">
                  <Label className="text-sm text-muted-foreground">Moment types to detect</Label>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {momentTypes.map((moment) => (
                      <div
                        key={moment.id}
                        onClick={() => handleMomentToggle(moment.id)}
                        className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-all ${
                          selectedMoments.includes(moment.id)
                            ? 'border-[var(--accent)] bg-[var(--accent)]/5'
                            : 'border-[#222222] hover:border-[var(--accent)]/50'
                        }`}
                      >
                        <Checkbox
                          checked={selectedMoments.includes(moment.id)}
                          onCheckedChange={() => handleMomentToggle(moment.id)}
                          className="pointer-events-none"
                        />
                        <moment.icon className={`h-4 w-4 ${moment.color}`} />
                        <span className="text-sm">{moment.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mt-8"
      >
        <Button
          onClick={handleUpload}
          disabled={!file || !game || isUploading}
          size="lg"
          className="w-full text-lg border border-[var(--accent)] bg-[var(--surface)] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-[#0A0A0A]"
        >
          {isUploading ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Processing...
            </>
          
          ) : (
            <>
              <Sparkles className="mr-2 h-5 w-5" />
              Start Processing
            </>
          )}
        </Button>
      </motion.div>
    </div>
  )
}
