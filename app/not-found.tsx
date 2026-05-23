import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Film, Home, Upload } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-12">
      <div className="relative w-full max-w-xl text-center">
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-x-20 -top-20 h-72 opacity-30 blur-3xl gradient-bg"
        />

        <div className="relative">
          <div className="mx-auto mb-8 inline-flex h-20 w-20 items-center justify-center rounded-3xl gradient-bg shadow-lg">
            <Film className="h-10 w-10 text-white" />
          </div>

          <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Error 404
          </p>
          <h1 className="mb-4 bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-5xl font-bold text-transparent sm:text-6xl">
            Clip not found
          </h1>
          <p className="mx-auto mb-10 max-w-md text-lg text-muted-foreground">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
            Let&apos;s get you back to your clips.
          </p>

          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button className="gradient-bg glow-hover w-full text-white sm:w-auto" asChild>
              <Link href="/dashboard">
                <Home className="mr-2 h-4 w-4" />
                Back to dashboard
              </Link>
            </Button>
            <Button variant="outline" className="w-full gradient-border sm:w-auto" asChild>
              <Link href="/upload">
                <Upload className="mr-2 h-4 w-4" />
                Upload a video
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
