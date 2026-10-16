import { describe, expect, it } from 'vitest'
import { buildShareUrl, shareIdFromSearch } from './shareUrl'

describe('shareIdFromSearch', () => {
  it('returns null when there is no share parameter', () => {
    expect(shareIdFromSearch('')).toBeNull()
    expect(shareIdFromSearch('?foo=bar')).toBeNull()
  })

  it('extracts a valid share id', () => {
    expect(shareIdFromSearch('?share=1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d')).toBe(
      '1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d',
    )
    expect(shareIdFromSearch('?foo=1&share=abcd1234')).toBe('abcd1234')
  })

  it('rejects ids with unexpected characters or lengths', () => {
    expect(shareIdFromSearch('?share=../../etc/passwd')).toBeNull()
    expect(shareIdFromSearch('?share=short')).toBeNull()
    expect(shareIdFromSearch(`?share=${'a'.repeat(65)}`)).toBeNull()
  })
})

describe('buildShareUrl', () => {
  it('builds a share URL from the current location', () => {
    expect(
      buildShareUrl('abcd1234', { origin: 'https://plan.example.com', pathname: '/app/' }),
    ).toBe('https://plan.example.com/app/?share=abcd1234')
  })

  it('url-encodes the id', () => {
    expect(buildShareUrl('a b', { origin: 'https://x.dev', pathname: '/' })).toBe(
      'https://x.dev/?share=a%20b',
    )
  })
})
