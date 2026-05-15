'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'

export function Logo({ size = 'default' }: { size?: 'default' | 'large' }) {
  const textSize = size === 'large' ? 'text-3xl' : 'text-xl'
  
  return (
    <Link href="/" className="flex items-center gap-2">
      <motion.div
        className="relative flex h-8 w-8 items-center justify-center"
        whileHover={{ scale: 1.05 }}
      >
        <div className="gradient-bg absolute inset-0 rounded-lg opacity-80" />
        <svg
          viewBox="0 0 24 24"
          fill="none"
          className="relative z-10 h-5 w-5 text-white"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polygon points="23 7 16 12 23 17 23 7" />
          <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
        </svg>
      </motion.div>
      <span className={`font-bold ${textSize}`}>
        <span className="gradient-text">Clip</span>
        <span className="text-foreground">Forge</span>
      </span>
    </Link>
  )
}
