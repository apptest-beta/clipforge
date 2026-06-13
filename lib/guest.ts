// Guest sessions don't get a real Supabase auth user, so we mint a stable
// per-browser ID and store it as the `user_id` on videos/clips created while
// browsing as a guest. This lets the dashboard find videos a guest just
// uploaded instead of always showing "No videos yet".
const GUEST_ID_KEY = 'cf_guest_id'

export function getGuestId(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(GUEST_ID_KEY)
}

export function getOrCreateGuestId(): string {
  if (typeof window === 'undefined') return ''
  const existing = localStorage.getItem(GUEST_ID_KEY)
  if (existing) return existing
  const id = `guest_${crypto.randomUUID()}`
  localStorage.setItem(GUEST_ID_KEY, id)
  return id
}
