import { describe, it, expect } from 'vitest'
import { cn, cleanFilename } from './utils'

describe('cn', () => {
  it('joins class names', () => {
    expect(cn('a', 'b')).toBe('a b')
  })

  it('drops falsy values', () => {
    expect(cn('a', false && 'b', null, undefined, 'c')).toBe('a c')
  })

  it('merges conflicting tailwind utilities (last wins)', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4')
  })

  it('supports conditional object syntax', () => {
    expect(cn('base', { active: true, hidden: false })).toBe('base active')
  })
})

describe('cleanFilename', () => {
  it('falls back to "Recording" for empty input', () => {
    expect(cleanFilename(null)).toBe('Recording')
    expect(cleanFilename(undefined)).toBe('Recording')
    expect(cleanFilename('')).toBe('Recording')
  })

  it('strips directory paths', () => {
    expect(cleanFilename('C:/videos/clips/foo.mp4')).toBe('foo')
    expect(cleanFilename('/home/user/bar.mov')).toBe('bar')
  })

  it('strips video extensions', () => {
    expect(cleanFilename('gameplay.webm')).toBe('gameplay')
    expect(cleanFilename('match.mkv')).toBe('match')
  })

  it('removes an OBS/Nvidia date-time stamp, leaving the readable title', () => {
    expect(cleanFilename('Valorant Ace 2026-04-21 21-07-39.mp4')).toBe('Valorant Ace')
  })

  it('returns "Recording" when only a timestamp remains', () => {
    expect(cleanFilename('2026-04-21 21-07-39.mp4')).toBe('Recording')
  })

  it('normalizes separators to spaces', () => {
    expect(cleanFilename('my_epic_clip.mp4')).toBe('my epic clip')
  })
})
