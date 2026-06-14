'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Mail, User, Loader2, LogOut, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { ensureProfile, usernameFromEmail, type Profile } from '@/lib/supabase/profiles'

export default function SettingsPage() {
  const supabase = createClient()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [originalUsername, setOriginalUsername] = useState('')

  useEffect(() => {
    let cancelled = false

    async function load() {
      const { data: userData } = await supabase.auth.getUser()
      const user = userData?.user

      if (!user) {
        if (!cancelled) setLoading(false)
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

      setProfile(row)
      setEmail(user.email ?? '')
      const u = row?.username ?? ''
      setUsername(u)
      setOriginalUsername(u)
      setLoading(false)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [supabase])

  const handleSave = async () => {
    if (!profile) {
      toast.error('You need to be logged in to save changes')
      return
    }

    const clean = username.trim().toLowerCase()
    if (clean.length < 2) {
      toast.error('Username must be at least 2 characters')
      return
    }
    if (clean === originalUsername) {
      toast.success('Nothing to update')
      return
    }

    setSaving(true)
    const { error } = await supabase
      .from('profiles')
      .update({ username: clean })
      .eq('id', profile.id)

    if (error) {
      toast.error(error.message)
      setSaving(false)
      return
    }

    setOriginalUsername(clean)
    setUsername(clean)
    setProfile({ ...profile, username: clean })
    setSaving(false)
    toast.success('Settings saved')
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const initial = (username || email || '?').charAt(0).toUpperCase()

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl">
        <Skeleton className="mb-6 h-10 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="mt-1 text-muted-foreground">Manage your account and preferences</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="space-y-6"
      >
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Update your personal information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-6">
              <Avatar className="h-16 w-16">
                <AvatarImage alt="Profile" />
                <AvatarFallback className="bg-[var(--surface)] border border-[var(--accent)] text-[var(--accent)] text-xl font-bold">
                  {initial}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{username || 'You'}</p>
                <p className="text-sm text-muted-foreground">{email}</p>
              </div>
            </div>

            <Separator />

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="your_handle"
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    readOnly
                    disabled
                    className="pl-9"
                  />
                </div>
              </div>
            </div>

            <Button
              onClick={handleSave}
              disabled={saving || !profile}
              className="cursor-pointer border border-[var(--accent)] bg-[var(--surface)] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-[#0A0A0A]"
            >
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save Changes
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>Manage your session</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              onClick={handleSignOut}
              className="cursor-pointer border-[#444444] text-[#EDEDED] hover:bg-[var(--surface)]"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </Button>
          </CardContent>
        </Card>

        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="text-destructive">Danger Zone</CardTitle>
            <CardDescription>Irreversible account actions</CardDescription>
          </CardHeader>
          <CardContent>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  className="cursor-pointer border-destructive/50 text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Account
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Account</AlertDialogTitle>
                  <AlertDialogDescription>
                    This feature is coming soon.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="cursor-pointer">Close</AlertDialogCancel>
                  <AlertDialogAction disabled className="cursor-not-allowed opacity-50">
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
