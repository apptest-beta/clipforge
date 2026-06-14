'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { FadeIn } from '@/components/motion/motion-primitives'

export default function NotFound() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '48px 24px' }}>
      <FadeIn>
        <div className="font-display" style={{ fontSize: '6rem', fontWeight: 700, color: '#F97316', lineHeight: 1, marginBottom: '16px', letterSpacing: '-0.04em' }}>
          404
        </div>
        <h1 className="font-display" style={{ fontSize: '1.75rem', fontWeight: 600, color: '#F2F2F2', marginBottom: '12px', letterSpacing: '-0.02em' }}>
          Page not found
        </h1>
        <p style={{ color: '#888888', fontSize: '1rem', maxWidth: '380px', margin: '0 auto 36px', lineHeight: 1.6 }}>
          The page you&apos;re looking for doesn&apos;t exist.
        </p>
        <motion.div
          className="inline-block"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          <Link
            href="/"
            style={{ border: '1px solid #F97316', color: '#F97316', background: 'transparent', padding: '10px 24px', borderRadius: '6px', fontWeight: 500, fontSize: '0.9rem', textDecoration: 'none', display: 'inline-block' }}
          >
            Go Home
          </Link>
        </motion.div>
      </FadeIn>
    </div>
  )
}
