'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { Upload, LayoutDashboard, Settings, Plus } from 'lucide-react'
import { supabase } from '@/lib/supabase'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/upload', label: 'Upload', icon: Upload },
  { href: '/settings', label: 'Settings', icon: Settings },
]

type RecentClip = {
  id: string
  video_id: string
  label: string
  ready: boolean
}

function formatLabel(game: string | null | undefined, moment: string | null | undefined) {
  const g = (game || '').trim()
  const m = (moment || '').trim()
  if (g && m) return `${g} - ${m}`
  return g || m || 'Clip'
}

export function AppSidebar() {
  const pathname = usePathname()
  const [recent, setRecent] = useState<RecentClip[]>([])
  const [loadingRecent, setLoadingRecent] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function loadRecent() {
      const { data: userData } = await supabase.auth.getUser()
      const user = userData?.user
      if (!user) {
        if (!cancelled) {
          setRecent([])
          setLoadingRecent(false)
        }
        return
      }

      const { data, error } = await supabase
        .from('clips')
        .select('id, video_id, moment_type, clip_url, videos!inner(game, user_id)')
        .eq('videos.user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5)

      if (cancelled) return

      if (error || !data) {
        setRecent([])
        setLoadingRecent(false)
        return
      }

      const mapped: RecentClip[] = data.map((row: any) => {
        const game = Array.isArray(row.videos) ? row.videos[0]?.game : row.videos?.game
        return {
          id: String(row.id),
          video_id: String(row.video_id),
          label: formatLabel(game, row.moment_type),
          ready: Boolean(row.clip_url),
        }
      })

      setRecent(mapped)
      setLoadingRecent(false)
    }

    loadRecent()
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      loadRecent()
    })
    return () => {
      cancelled = true
      sub.subscription.unsubscribe()
    }
  }, [pathname])

  return (
    <motion.aside
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      style={{ background: '#0D0D0D', borderRight: '1px solid #1F1F1F' }}
      className="fixed left-0 top-16 z-40 hidden h-[calc(100vh-4rem)] w-64 lg:block"
    >
      <div className="flex h-full flex-col p-4">
        <motion.div whileHover={{ scale: 1.03 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}>
          <Button className="mb-6 w-full cursor-pointer border border-[var(--accent)] bg-[var(--surface)] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-[#0A0A0A]" asChild>
            <Link href="/upload">
              <Plus className="mr-2 h-4 w-4" />
              Upload Video
            </Link>
          </Button>
        </motion.div>

        <nav className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                style={
                  isActive
                    ? {
                        borderLeft: '3px solid #C9A84C',
                        background: 'rgba(201,168,76,0.08)',
                        color: '#C9A84C',
                        borderRadius: '0 6px 6px 0',
                      }
                    : { color: '#888888' }
                }
                className={cn(
                  'flex items-center gap-3 px-3 py-2 text-sm transition-all',
                  !isActive && 'rounded-lg hover:bg-[#111111] hover:text-[#F2F2F2]'
                )}
              >
                <motion.span
                  className="flex items-center gap-3"
                  whileHover={{ x: 2 }}
                  transition={{ duration: 0.15 }}
                >
                  <item.icon className="h-4 w-4" style={isActive ? { color: '#C9A84C' } : {}} />
                  {item.label}
                </motion.span>
              </Link>
            )
          })}
        </nav>

        <div className="mt-8">
          <h3 className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Recent Clips
          </h3>
          <div className="space-y-1">
            {loadingRecent ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-lg px-3 py-2"
                >
                  <Skeleton className="h-2 w-2 rounded-full" />
                  <Skeleton className="h-3 flex-1" />
                </div>
              ))
            ) : recent.length === 0 ? (
              <p className="px-3 py-2 text-xs text-muted-foreground">
                No clips yet
              </p>
            ) : (
              recent.map((clip) => (
                <Link
                  key={clip.id}
                  href={`/clips/${clip.video_id}`}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-all hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                >
                  <div
                    className={cn(
                      'h-2 w-2 shrink-0 rounded-full',
                      clip.ready ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'
                    )}
                  />
                  <span className="truncate capitalize">{clip.label}</span>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </motion.aside>
  )
}
