import { createBrowserClient } from '@supabase/ssr'

// Browser-side Supabase client. Stores sessions in cookies so that
// our middleware (and any server components / route handlers) can
// see the same auth state.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
