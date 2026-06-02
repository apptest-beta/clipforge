'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { Navbar } from '@/components/navbar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Zap, Wand2, Download, Upload, Play, Sparkles } from 'lucide-react'

const features = [
  {
    icon: Zap,
    title: 'Auto-Detect Moments',
    description: 'AI identifies kills, clutches, rage moments, and jump scares with 95% accuracy.',
  },
  {
    icon: Wand2,
    title: 'Smart Editing',
    description: 'Automatically trim, crop, and enhance clips with perfect timing and transitions.',
  },
  {
    icon: Download,
    title: 'One-Click Export',
    description: 'Export directly to TikTok, YouTube Shorts, and Instagram Reels formats.',
  },
]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
}

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      duration: 0.5,
    },
  },
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar variant="landing" />

      {/* Hero Section */}
      <section className="relative overflow-hidden px-6 py-24 lg:py-32">
        {/* Background gradient effects */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">

        </div>

        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="relative mx-auto max-w-5xl text-center"
        >
          <motion.div variants={itemVariants}>
            <Badge variant="secondary" className="mb-6 px-4 py-1.5 text-sm">
              <Sparkles className="mr-2 h-3.5 w-3.5" />
              AI-Powered Video Editing
            </Badge>
          </motion.div>

          <motion.h1
            variants={itemVariants}
            className="text-balance text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl"
          >
            Turn 3-hour streams into{' '}
            <span className="gradient-text">viral clips</span> in 5 minutes
          </motion.h1>

          <motion.p
            variants={itemVariants}
            className="mx-auto mt-6 max-w-2xl text-pretty text-lg text-muted-foreground sm:text-xl"
          >
            AI finds your kills, clutches, and rage moments automatically. Stop scrolling through hours of footage - let
            ClipForge do the work.
          </motion.p>

          <motion.div variants={itemVariants} className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button size="lg" className="border border-[#E8FF47] bg-[#1A1A1A] text-[#E8FF47] text-lg hover:bg-[#E8FF47] hover:text-[#0D0D0D] cursor-pointer" asChild>
              <Link href="/upload">
                Get Started Free
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="text-lg" asChild>
              <Link href="#demo">
                <Play className="mr-2 h-5 w-5" />
                Watch Demo
              </Link>
            </Button>
          </motion.div>
        </motion.div>
      </section>

      {/* Upload Demo Section */}
      <section id="demo" className="px-6 py-24">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-4xl"
        >
          <div className="rounded-2xl border border-[#2A2A2A] bg-card p-8 lg:p-12">
            <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-secondary/30 p-12 transition-colors hover:border-primary/50 hover:bg-secondary/50">
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                className="gradient-bg mb-6 rounded-2xl p-4"
              >
                <Upload className="h-10 w-10 text-white" />
              </motion.div>
              <h3 className="mb-2 text-xl font-semibold">Drop your recording here</h3>
              <p className="mb-6 text-muted-foreground">or click to browse files</p>
              <div className="flex flex-wrap justify-center gap-2">
                <Badge variant="outline">.mp4</Badge>
                <Badge variant="outline">.mov</Badge>
                <Badge variant="outline">.avi</Badge>
                <Badge variant="outline">up to 10GB</Badge>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section id="features" className="px-6 py-24">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={containerVariants}
          className="mx-auto max-w-6xl"
        >
          <motion.div variants={itemVariants} className="mb-16 text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Everything you need to go <span className="gradient-text">viral</span>
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Powerful AI tools designed for gaming content creators
            </p>
          </motion.div>

          <div className="grid gap-8 md:grid-cols-3">
            {features.map((feature, index) => (
              <motion.div key={feature.title} variants={itemVariants}>
                <Card className="h-full border-[#2A2A2A] bg-[#141414] transition-all hover:-translate-y-1">
                  <CardHeader>
                    <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl border border-[#2A2A2A] bg-[#1A1A1A]">
                      <feature.icon className="h-6 w-6 text-[#E8FF47]" />
                    </div>
                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base">{feature.description}</CardDescription>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* CTA Section */}
      <section className="px-6 py-24">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mx-auto max-w-4xl"
        >
          <div className="relative overflow-hidden rounded-3xl border border-[#2A2A2A] bg-[#141414] p-12 text-center lg:p-16">

            <h2 className="relative text-3xl font-bold sm:text-4xl">
              Ready to create viral clips?
            </h2>
            <p className="relative mt-4 text-lg text-muted-foreground">
              Join thousands of creators who save hours every week with ClipForge.
            </p>
            <Button
              size="lg"
              variant="secondary"
              className="relative mt-8 cursor-pointer border border-[#E8FF47] bg-[#1A1A1A] text-lg font-semibold text-[#E8FF47] hover:bg-[#E8FF47] hover:text-[#0D0D0D]"
              asChild
            >
              <Link href="/upload">Start for free</Link>
            </Button>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-12">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 md:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#E8FF47] bg-[#1A1A1A]">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="h-5 w-5 text-[#E8FF47]"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polygon points="23 7 16 12 23 17 23 7" />
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
              </svg>
            </div>
            <span className="font-bold">ClipForge</span>
          </div>
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} ClipForge. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
