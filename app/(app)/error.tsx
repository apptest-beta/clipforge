'use client'

import { AlertTriangle } from 'lucide-react'
import { FadeIn } from '@/components/motion/motion-primitives'
import { MotionButton } from '@/components/motion/motion-primitives'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '48px 24px' }}>
      <FadeIn>
        <AlertTriangle size={40} style={{ color: '#F97316', marginBottom: '24px' }} />
        <h2 className="font-display" style={{ fontSize: '1.5rem', fontWeight: 600, color: '#F2F2F2', marginBottom: '12px', letterSpacing: '-0.02em' }}>
          Something went wrong
        </h2>
        <p style={{ color: '#888888', fontSize: '0.95rem', maxWidth: '380px', marginBottom: '32px', lineHeight: 1.6 }}>
          {error.message || 'An unexpected error occurred. Please try again.'}
        </p>
        <MotionButton
          onClick={reset}
          style={{ border: '1px solid #F97316', color: '#F97316', background: 'transparent', padding: '10px 24px', borderRadius: '6px', fontWeight: 500, fontSize: '0.9rem', cursor: 'pointer' }}
        >
          Try Again
        </MotionButton>
      </FadeIn>
    </div>
  )
}
