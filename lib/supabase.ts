import { createClient } from './supabase/client'

// Singleton browser client. Re-exported so the existing `import { supabase } from '@/lib/supabase'`
// pattern keeps working — but the underlying client now uses cookie-based sessions
// (via @supabase/ssr) so middleware and server components see the same auth state.
export const supabase = createClient()
