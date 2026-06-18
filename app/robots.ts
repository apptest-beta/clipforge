import type { MetadataRoute } from 'next'

const siteUrl = 'https://clipforge-swart.vercel.app'

// Crawl rules: index the public marketing/auth pages, keep crawlers out of the
// API routes and the authenticated app shell (which require a session anyway).
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/dashboard', '/clips/', '/editor/', '/exports', '/settings', '/upload'],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  }
}
