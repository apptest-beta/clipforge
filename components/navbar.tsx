'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Logo } from './logo'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ChevronDown, Settings, LogOut, User } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { ensureProfile, usernameFromEmail } from '@/lib/supabase/profiles'

interface NavbarProps {
  variant?: 'landing' | 'app'
}

export function Navbar({ variant = 'landing' }: NavbarProps) {
  const router = useRouter()
  const supabase = createClient()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [isGuest, setIsGuest] = useState(false)

  // Load the user once on mount, then resubscribe to auth state changes so the
  // navbar updates instantly on login/logout without a full page reload.
  useEffect(() => {
    if (variant !== 'app') return

    let cancelled = false

    async function load() {
      const { data } = await supabase.auth.getUser()
      const user = data?.user

      if (!user) {
        if (cancelled) return
        setIsGuest(false)
        setUsername('')
        setEmail('')
        return
      }

      if (user.is_anonymous) {
        if (cancelled) return
        setIsGuest(true)
        setUsername('')
        setEmail('')
        return
      }

      const row = await ensureProfile(supabase, {
        id: user.id,
        email: user.email ?? null,
        username:
          (user.user_metadata?.username as string | undefined) ||
          usernameFromEmail(user.email),
      })

      if (cancelled) return
      setIsGuest(false)
      setEmail(user.email ?? '')
      setUsername(row?.username || usernameFromEmail(user.email))
    }

    load()

    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      // Defer: calling Supabase functions synchronously inside the
      // onAuthStateChange callback can deadlock the auth client's lock.
      setTimeout(() => load(), 0)
    })

    return () => {
      cancelled = true
      sub.subscription.unsubscribe()
    }
  }, [supabase, variant])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  if (variant === 'app') {
    const initial = (username || email || 'U').charAt(0).toUpperCase()
    const displayName = isGuest ? 'Guest' : username || 'You'

    return (
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl"
      >
        <div className="flex h-16 items-center justify-between px-6">
          <Logo />
          <div className="flex items-center gap-4">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 px-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage alt="User" />
                    <AvatarFallback className="border border-[var(--accent)] bg-[var(--surface)] text-[var(--accent)] text-sm">{initial}</AvatarFallback>
                  </Avatar>
                  <span className="hidden text-sm font-medium sm:inline">{displayName}</span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5 text-sm">
                  <p className="font-medium">{displayName}</p>
                  {email && !isGuest ? (
                    <p className="truncate text-xs text-muted-foreground">{email}</p>
                  ) : null}
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/settings">
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings">
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {isGuest ? (
                  <DropdownMenuItem asChild>
                    <Link href="/login">
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign in
                    </Link>
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={handleSignOut}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Log out
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </motion.header>
    )
  }

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl"
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Logo />
        <nav className="hidden items-center gap-8 md:flex">
          <Link href="#features" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            Features
          </Link>
          <Link href="#demo" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
            Demo
          </Link>
        </nav>
        <div className="flex items-center gap-3">
          <Button variant="ghost" asChild>
            <Link href="/login">Log in</Link>
          </Button>
          <Button className="cursor-pointer border border-[var(--accent)] bg-[var(--surface)] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-[#0A0A0A]" asChild>
            <Link href="/signup">Get Started</Link>
          </Button>
        </div>
      </div>
    </motion.header>
  )
}
