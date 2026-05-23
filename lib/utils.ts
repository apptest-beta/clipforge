import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Turn raw filenames like "2026-04-21 21-07-39.mp4" into something readable.
// Strips directory paths, video extensions, and OBS/Nvidia date+time prefixes.
export function cleanFilename(raw: string | null | undefined): string {
  if (!raw) return 'Recording'

  let name = raw
  name = name.replace(/^.*[\\/]/, '')
  name = name.replace(/\.(mp4|mov|webm|mkv|avi|m4v)$/i, '')
  name = name.replace(
    /\b\d{4}[-_.]?\d{2}[-_.]?\d{2}[\s_T-]\d{2}[-_.:]?\d{2}[-_.:]?\d{2}\b/g,
    ''
  )
  name = name.replace(/^\d{4}[-_.]\d{2}[-_.]\d{2}\b/, '')
  name = name.replace(/^\d{2}[-_.:]\d{2}[-_.:]\d{2}\b/, '')
  name = name.replace(/[\s_\-.]+/g, ' ').trim()

  return name.length > 0 ? name : 'Recording'
}
