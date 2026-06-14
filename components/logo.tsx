'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Scissors } from 'lucide-react'

export function Logo({ size = 'default' }: { size?: 'default' | 'large' }) {
  const textSize = size === 'large' ? 'text-3xl' : 'text-xl'

  return (
    <Link href="/" className="flex items-center gap-2">
      <motion.div
        whileHover={{ rotate: -12, scale: 1.08 }}
        transition={{ type: 'spring', stiffness: 300, damping: 15 }}
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--accent)] bg-[var(--surface)]"
      >
        <Scissors className="h-4 w-4 text-[var(--accent)]" />
      </motion.div>
      <span className={`font-bold ${textSize}`}>
        <span className="text-[var(--accent)]">Clip</span>
        <span className="text-foreground">Forge</span>
      </span>
    </Link>
  )
}
