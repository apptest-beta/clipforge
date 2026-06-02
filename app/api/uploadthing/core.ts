import { createUploadthing, type FileRouter } from 'uploadthing/next'
import { createClient } from '@/lib/supabase/server'

const f = createUploadthing()

export const ourFileRouter = {
  videoUploader: f({ video: { maxFileSize: '2GB', maxFileCount: 1 } })
    .middleware(async () => {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      // Allow unauthenticated uploads (guest flow) — same as the rest of the app
      return { userId: user?.id ?? null }
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return { url: file.ufsUrl, key: file.key }
    }),
} satisfies FileRouter

export type OurFileRouter = typeof ourFileRouter
