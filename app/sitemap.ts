import type { MetadataRoute } from 'next'

const siteUrl = 'https://clipforge-swart.vercel.app'

// Only public, crawlable routes belong here. The rest of the app sits behind
// auth and is intentionally excluded (see robots.ts).
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()
  return [
    {
      url: `${siteUrl}/`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${siteUrl}/login`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${siteUrl}/signup`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
  ]
}
