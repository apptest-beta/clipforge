import type { MetadataRoute } from 'next'

// Web app manifest so ClipForge can be installed as a PWA and gets a proper
// name/theme on mobile home screens. Icons reference assets already in /public.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'ClipForge - AI-Powered Clip Finder for Gaming',
    short_name: 'ClipForge',
    description:
      'Turn 3-hour streams into viral clips in 5 minutes. AI finds your kills, clutches, and rage moments automatically.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0A0A0A',
    theme_color: '#0A0A0A',
    icons: [
      {
        src: '/icon.svg',
        type: 'image/svg+xml',
        sizes: 'any',
      },
      {
        src: '/icon-light-32x32.png',
        type: 'image/png',
        sizes: '32x32',
      },
      {
        src: '/apple-icon.png',
        type: 'image/png',
        sizes: '180x180',
      },
    ],
  }
}
