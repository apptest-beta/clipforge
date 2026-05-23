import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ensureProfile, usernameFromEmail } from '@/lib/supabase/profiles'

// OAuth callback. Supabase redirects users here with a `?code=` after Google/Discord login.
// We exchange the code for a session (which sets cookies), make sure a profiles row
// exists for the user, then redirect to wherever they were going.
//
// NOTE: This needs to be a Route Handler (route.ts), not a page.tsx, because the
// code-for-session exchange has to happen server-side to set httpOnly auth cookies
// that the middleware can read.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') || '/dashboard'

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`)
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !data.user) {
    console.error('OAuth exchange failed:', error)
    return NextResponse.redirect(`${origin}/login?error=oauth_failed`)
  }

  // OAuth users don't pick a username — derive one from their email prefix.
  // ensureProfile is a no-op if the row already exists.
  const metaUsername =
    (data.user.user_metadata?.username as string | undefined) ||
    usernameFromEmail(data.user.email)

  await ensureProfile(supabase, {
    id: data.user.id,
    email: data.user.email ?? null,
    username: metaUsername,
  })

  // Clear any lingering guest cookie now that the user is signed in.
  const response = NextResponse.redirect(`${origin}${next}`)
  response.cookies.set('cf_guest', '', { path: '/', maxAge: 0 })
  return response
}
