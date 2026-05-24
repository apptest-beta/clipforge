'use client'

export const dynamic = 'force-dynamic'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Mail, Lock, Loader2 } from 'lucide-react'
import { Logo } from '@/components/logo'
import { createClient } from '@/lib/supabase/client'

// Inner component holds the useSearchParams call. Next.js requires anything
// that reads search params to live under a Suspense boundary, otherwise the
// build-time prerender fails with "useSearchParams should be wrapped in a
// suspense boundary at page ...".
function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const next = searchParams.get('next') || '/dashboard'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [oauthProvider, setOauthProvider] = useState<string | null>(null)

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (submitting || oauthProvider) return
    setSubmitting(true)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      toast.error(error.message)
      setSubmitting(false)
      return
    }

    toast.success('Logged in')
    router.push(next)
    router.refresh()
  }

  const handleOAuth = async (provider: 'google' | 'discord') => {
    setOauthProvider(provider)
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${origin}/callback?next=${encodeURIComponent(next)}`,
      },
    })
    if (error) {
      toast.error(error.message)
      setOauthProvider(null)
    }
  }

  const handleGuest = () => {
    document.cookie = 'cf_guest=1; path=/; max-age=86400; SameSite=Lax'
    try {
      localStorage.setItem('cf_guest', '1')
    } catch {}
    router.push('/dashboard')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Welcome back</CardTitle>
            <CardDescription>Log in to keep editing your clips</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={!!oauthProvider || submitting}
                onClick={() => handleOAuth('google')}
              >
                {oauthProvider === 'google' ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <GoogleIcon className="mr-2 h-4 w-4" />
                )}
                Continue with Google
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={!!oauthProvider || submitting}
                onClick={() => handleOAuth('discord')}
              >
                {oauthProvider === 'discord' ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <DiscordIcon className="mr-2 h-4 w-4" />
                )}
                Continue with Discord
              </Button>
            </div>

            <div className="relative my-2">
              <Separator />
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
                or
              </span>
            </div>

            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="********"
                    className="pl-9"
                  />
                </div>
              </div>
              <Button
                type="submit"
                disabled={submitting || !!oauthProvider}
                className="gradient-bg w-full text-white"
              >
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Log in
              </Button>
            </form>

            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={handleGuest}
              disabled={submitting || !!oauthProvider}
            >
              Try without account
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              No account yet?{' '}
              <Link href="/signup" className="text-primary hover:underline">
                Sign up
              </Link>
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  )
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.2 1.4-1.6 4-5.5 4-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.7 3.4 14.6 2.5 12 2.5 6.8 2.5 2.6 6.7 2.6 12s4.2 9.5 9.4 9.5c5.4 0 9-3.8 9-9.2 0-.6-.1-1.1-.2-1.6H12z"
      />
    </svg>
  )
}

function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path
        fill="#5865F2"
        d="M20.3 4.6A19.8 19.8 0 0 0 16 3.2l-.2.4c1.7.4 3 1 4.3 1.7-1.7-.8-3.5-1.4-5.4-1.5-1.7-.1-3.4 0-5 .4-1.5.3-2.9.9-4.3 1.6 1.3-.7 2.6-1.3 4.3-1.7l-.2-.4A19.8 19.8 0 0 0 3.7 4.6 21.6 21.6 0 0 0 1 16.4a14 14 0 0 0 4.4 2.2l.9-1.2a9.5 9.5 0 0 1-1.7-.8c.1-.1.3-.2.4-.3a13.7 13.7 0 0 0 12 0c.2.1.3.2.4.3-.5.3-1.1.6-1.7.8l.9 1.2a14 14 0 0 0 4.4-2.2 21.6 21.6 0 0 0-2.7-11.8zM8.5 14.3c-1 0-1.9-.9-1.9-2.1 0-1.2.8-2.1 1.9-2.1 1 0 1.9.9 1.9 2.1 0 1.2-.8 2.1-1.9 2.1zm7 0c-1 0-1.9-.9-1.9-2.1 0-1.2.8-2.1 1.9-2.1 1 0 1.9.9 1.9 2.1 0 1.2-.8 2.1-1.9 2.1z"
      />
    </svg>
  )
}
