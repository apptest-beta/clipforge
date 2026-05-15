'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Logo } from './logo'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Upload, Film, Download, Settings, Plus } from 'lucide-react'

const navItems = [
  { href: '/dashboard', label: 'My Clips', icon: Film },
  { href: '/upload', label: 'Upload', icon: Upload },
  { href: '/exports', label: 'Exports', icon: Download },
  { href: '/settings', label: 'Settings', icon: Settings },
]

const recentClips = [
  { id: '1', name: 'Valorant Clutch 1v4', status: 'ready' },
  { id: '2', name: 'Fortnite Victory', status: 'processing' },
  { id: '3', name: 'CS2 Ace', status: 'ready' },
]

export function AppSidebar() {
  const pathname = usePathname()

  return (
    <motion.aside
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className="fixed left-0 top-16 z-40 hidden h-[calc(100vh-4rem)] w-64 border-r border-border bg-sidebar lg:block"
    >
      <div className="flex h-full flex-col p-4">
        <Button className="gradient-bg glow-hover mb-6 w-full text-white" asChild>
          <Link href="/upload">
            <Plus className="mr-2 h-4 w-4" />
            Upload Video
          </Link>
        </Button>

        <nav className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all',
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
                )}
              >
                <item.icon className={cn('h-4 w-4', isActive && 'text-primary')} />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="mt-8">
          <h3 className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Recent Clips
          </h3>
          <div className="space-y-1">
            {recentClips.map((clip) => (
              <Link
                key={clip.id}
                href={`/editor/${clip.id}`}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-all hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              >
                <div
                  className={cn(
                    'h-2 w-2 rounded-full',
                    clip.status === 'ready' ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'
                  )}
                />
                <span className="truncate">{clip.name}</span>
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-auto rounded-lg border border-border bg-card p-4">
          <div className="mb-2 text-sm font-medium">Free Plan</div>
          <div className="mb-3 text-xs text-muted-foreground">18 min / 30 min used</div>
          <div className="mb-3 h-2 overflow-hidden rounded-full bg-secondary">
            <div className="gradient-bg h-full w-[60%] transition-all" />
          </div>
          <Button variant="outline" size="sm" className="w-full gradient-border" asChild>
            <Link href="#pricing">Upgrade</Link>
          </Button>
        </div>
      </div>
    </motion.aside>
  )
}
