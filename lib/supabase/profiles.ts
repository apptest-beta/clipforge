import type { SupabaseClient } from '@supabase/supabase-js'

export interface Profile {
  id: string
  username: string
  email: string | null
  plan: string
  usage_minutes: number
  created_at: string
}

// Derive a sensible username from an email address: take the part before
// the @, strip anything that isn't alphanumeric/underscore/dash, and
// fall back to "user" if we end up with an empty string.
export function usernameFromEmail(email: string | null | undefined): string {
  if (!email) return 'user'
  const prefix = email.split('@')[0] || ''
  const cleaned = prefix.replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase()
  return cleaned.length > 0 ? cleaned : 'user'
}

/**
 * Make sure a `profiles` row exists for the current user.
 * Returns the existing row, or inserts and returns a fresh one.
 * Safe to call on every login — it's a no-op if the row already exists.
 */
export async function ensureProfile(
  supabase: SupabaseClient,
  opts: { id: string; email: string | null; username?: string | null }
): Promise<Profile | null> {
  const { id, email } = opts

  // Try to load first.
  const { data: existing } = await supabase
    .from('profiles')
    .select('id, username, email, plan, usage_minutes, created_at')
    .eq('id', id)
    .maybeSingle()

  if (existing) return existing as Profile

  const username = (opts.username || '').trim() || usernameFromEmail(email)

  const { data: inserted, error } = await supabase
    .from('profiles')
    .insert({
      id,
      username,
      email,
      plan: 'free',
      usage_minutes: 0,
    })
    .select('id, username, email, plan, usage_minutes, created_at')
    .single()

  if (error) {
    // If two requests race, swallow the duplicate-key error and re-read.
    if (error.code === '23505') {
      const { data } = await supabase
        .from('profiles')
        .select('id, username, email, plan, usage_minutes, created_at')
        .eq('id', id)
        .maybeSingle()
      return (data as Profile) || null
    }
    console.error('ensureProfile insert failed:', error)
    return null
  }

  return inserted as Profile
}
