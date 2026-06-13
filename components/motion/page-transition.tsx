'use client'
import { motion, useReducedMotion } from 'framer-motion'
import React from 'react'

// Returns false during SSR and the initial client render (matching the server
// markup), then switches to the real reduced-motion preference after mount —
// avoids hydration mismatches when the user has Reduced Motion enabled.
function useMountedReducedMotion() {
  const reduced = useReducedMotion()
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => setMounted(true), [])
  return mounted && !!reduced
}

export function PageTransition({ children }: { children: React.ReactNode }) {
  const reduced = useMountedReducedMotion()
  if (reduced) return <>{children}</>
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  )
}
