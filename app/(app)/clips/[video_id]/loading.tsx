import { Loader2 } from 'lucide-react'

// Suspense fallback shown while the clips route segment loads.
export default function Loading() {
  return (
    <div className="flex items-center justify-center py-24" role="status" aria-label="Loading">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      <span className="sr-only">Loading…</span>
    </div>
  )
}
