'use client'

import Link from 'next/link'
import { Scissors } from 'lucide-react'

export function Logo({ size = 'default' }: { size?: 'default' | 'large' }) {
  const textSize = size === 'large' ? 'text-3xl' : 'text-xl'

  return (
    <Link href="/" className="flex items-center gap-2">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E8FF47] bg-[#1A1A1A]">
        <Scissors className="h-4 w-4 text-[#E8FF47]" />
      </div>
      <span className={`font-bold ${textSize}`}>
        <span className="text-[#E8FF47]">Clip</span>
        <span className="text-foreground">Forge</span>
      </span>
    </Link>
  )
}
