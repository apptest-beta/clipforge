'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Camera, Mail, User, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { ensureProfile, usernameFromEmail, type Profile } from '@/lib/supabase/profiles'

export default function SettingsPage() {
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [originalUsername, setOriginalUsername] = useState('')

  const [emailNotifications, setEmailNotifications] = useState(true)
  const [processingUpdates, setProcessingUpdates] = useState(true)
  const [marketingEmails, setMarketingEmails] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function load() {
      const { data: userData } = await supabase.auth.getUser()
      const user = userData?.user

      if (!user) {
        if (!cancelled) setLoading(false)
        return
      }

      // ensureProfile is a no-op if the row already exists, so this
      // doubles as a self-heal for accounts created before the profiles table.
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

  const initial = (username || email || '?').charAt(0).toUpperCase()
  const planLabel = profile?.plan ? `${profile.plan.charAt(0).toUpperCase()}${profile.plan.slice(1)} Plan` : 'Guest'

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
              <div className="relative">
                <Avatar className="h-20 w-20">
                  <AvatarImage src="/avatar.png" alt="Profile" />
                  <AvatarFallback className="gradient-bg text-2xl text-white">{initial}</AvatarFallback>
                </Avatar>
                <Button
                  size="icon"
                  variant="secondary"
                  className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full"
                >
                  <Camera className="h-4 w-4" />
                </Button>
              </div>
              <div>
                <p className="font-medium">{username || 'You'}</p>
                <p className="text-sm text-muted-foreground">{planLabel}</p>
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
              className="gradient-bg text-white"
            >
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save Changes
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>Configure how you receive updates</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Email notifications</p>
                <p className="text-sm text-muted-foreground">
                  Receive email when your clips are ready
                </p>
              </div>
              <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Processing updates</p>
                <p className="text-sm text-muted-foreground">
                  Get notified about processing status
                </p>
              </div>
              <Switch checked={processingUpdates} onCheckedChange={setProcessingUpdates} />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Marketing emails</p>
                <p className="text-sm text-muted-foreground">
                  Receive tips and product updates
                </p>
              </div>
              <Switch checked={marketingEmails} onCheckedChange={setMarketingEmails} />
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
