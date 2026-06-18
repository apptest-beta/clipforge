import { describe, it, expect } from 'vitest'
import {
  isUuid,
  isPositiveNumber,
  isCloudinaryUrl,
  isOwnCloudinaryUrl,
  isSafeRedirectPath,
  isHttpUrl,
  isAllowedVideoMime,
  hasOnlyKeys,
} from './validators'

describe('isUuid', () => {
  it('accepts canonical v4 UUIDs', () => {
    expect(isUuid('123e4567-e89b-12d3-a456-426614174000')).toBe(true)
    expect(isUuid('0157b9ac-7b73-4bfe-b3fd-1624b2a4b2f4')).toBe(true)
  })

  it('rejects malformed strings and non-strings', () => {
    expect(isUuid('not-a-uuid')).toBe(false)
    expect(isUuid('123e4567e89b12d3a456426614174000')).toBe(false)
    expect(isUuid(42)).toBe(false)
    expect(isUuid(null)).toBe(false)
  })
})

describe('isPositiveNumber', () => {
  it('accepts finite positive numbers', () => {
    expect(isPositiveNumber(5)).toBe(true)
    expect(isPositiveNumber(0.1)).toBe(true)
  })

  it('rejects zero, negatives, NaN, Infinity, and strings', () => {
    expect(isPositiveNumber(0)).toBe(false)
    expect(isPositiveNumber(-3)).toBe(false)
    expect(isPositiveNumber(NaN)).toBe(false)
    expect(isPositiveNumber(Infinity)).toBe(false)
    expect(isPositiveNumber('5')).toBe(false)
  })
})

describe('isCloudinaryUrl', () => {
  it('accepts https res.cloudinary.com URLs', () => {
    expect(isCloudinaryUrl('https://res.cloudinary.com/acct/video/upload/x.mp4')).toBe(true)
  })

  it('rejects http, other hosts, and non-strings', () => {
    expect(isCloudinaryUrl('http://res.cloudinary.com/acct/x.mp4')).toBe(false)
    expect(isCloudinaryUrl('https://evil.com/x.mp4')).toBe(false)
    expect(isCloudinaryUrl(123)).toBe(false)
  })
})

describe('isOwnCloudinaryUrl', () => {
  const cloud = 'dffygtstq'

  it('accepts URLs under the configured cloud name', () => {
    expect(
      isOwnCloudinaryUrl(`https://res.cloudinary.com/${cloud}/video/upload/x.mp4`, cloud)
    ).toBe(true)
  })

  it('rejects other tenants', () => {
    expect(isOwnCloudinaryUrl('https://res.cloudinary.com/someoneelse/x.mp4', cloud)).toBe(false)
  })
})

describe('isSafeRedirectPath', () => {
  it('accepts internal root-relative paths', () => {
    expect(isSafeRedirectPath('/')).toBe(true)
    expect(isSafeRedirectPath('/dashboard')).toBe(true)
  })

  it('rejects open-redirect tricks and absolute URLs', () => {
    expect(isSafeRedirectPath('//evil.com')).toBe(false)
    expect(isSafeRedirectPath('/\\evil.com')).toBe(false)
    expect(isSafeRedirectPath('https://evil.com')).toBe(false)
    expect(isSafeRedirectPath('dashboard')).toBe(false)
    expect(isSafeRedirectPath(null)).toBe(false)
  })
})

describe('isHttpUrl', () => {
  it('accepts http and https URLs', () => {
    expect(isHttpUrl('https://example.com')).toBe(true)
    expect(isHttpUrl('http://example.com/a/b')).toBe(true)
  })

  it('rejects other protocols and junk', () => {
    expect(isHttpUrl('ftp://example.com')).toBe(false)
    expect(isHttpUrl('not a url')).toBe(false)
    expect(isHttpUrl(null)).toBe(false)
  })
})

describe('isAllowedVideoMime', () => {
  it('accepts the allowed video mimes', () => {
    expect(isAllowedVideoMime('video/mp4')).toBe(true)
    expect(isAllowedVideoMime('video/webm')).toBe(true)
    expect(isAllowedVideoMime('video/x-matroska')).toBe(true)
  })

  it('rejects disallowed mimes and non-strings', () => {
    expect(isAllowedVideoMime('video/mpeg')).toBe(false)
    expect(isAllowedVideoMime('image/png')).toBe(false)
    expect(isAllowedVideoMime(undefined)).toBe(false)
  })
})

describe('hasOnlyKeys', () => {
  it('accepts objects whose keys are all in the allow-list', () => {
    expect(hasOnlyKeys({ a: 1 }, ['a', 'b'])).toBe(true)
    expect(hasOnlyKeys({}, ['a'])).toBe(true)
  })

  it('rejects unexpected keys and non-objects', () => {
    expect(hasOnlyKeys({ a: 1, c: 2 }, ['a'])).toBe(false)
    expect(hasOnlyKeys(null, ['a'])).toBe(false)
    expect(hasOnlyKeys('nope', ['a'])).toBe(false)
  })
})
