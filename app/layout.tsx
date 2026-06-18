import type { Metadata, Viewport } from 'next'
import { Inter, Space_Grotesk } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from '@/components/ui/sonner'
import ShaderBackground from '@/components/ui/shader-background'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-sans', weight: ['400', '500', '600'] })
const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-display', weight: ['500', '600', '700'] })

const siteUrl = 'https://clipforge-swart.vercel.app'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'ClipForge - AI-Powered Clip Finder for Gaming',
    template: '%s | ClipForge',
  },
  description: 'Turn 3-hour streams into viral clips in 5 minutes. AI finds your kills, clutches, and rage moments automatically.',
  applicationName: 'ClipForge',
  generator: 'v0.app',
  keywords: [
    'gaming clips',
    'clip finder',
    'AI highlights',
    'stream highlights',
    'gameplay editor',
    'twitch clips',
    'kill montage',
    'ClipForge',
  ],
  authors: [{ name: 'ClipForge' }],
  creator: 'ClipForge',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    siteName: 'ClipForge',
    title: 'ClipForge - AI-Powered Clip Finder for Gaming',
    description: 'Turn 3-hour streams into viral clips in 5 minutes. AI finds your kills, clutches, and rage moments automatically.',
    url: siteUrl,
    locale: 'en_US',
    images: [{ url: '/apple-icon.png', width: 180, height: 180, alt: 'ClipForge' }],
  },
  twitter: {
    card: 'summary',
    title: 'ClipForge - AI-Powered Clip Finder for Gaming',
    description: 'Turn 3-hour streams into viral clips in 5 minutes. AI finds your kills, clutches, and rage moments automatically.',
    images: ['/apple-icon.png'],
  },
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#0A0A0A',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <body className="font-sans antialiased">
        <ShaderBackground />
        <div className="fixed inset-0 -z-40 bg-black/40 pointer-events-none" />
        {children}
        <Toaster />
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
