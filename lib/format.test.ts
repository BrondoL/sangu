import { describe, it, expect } from 'vitest'
import { formatRupiah, parseRupiah } from './format'

describe('formatRupiah', () => {
  it('formats whole rupiah with thousands separators', () => {
    expect(formatRupiah(1500000)).toBe('Rp 1.500.000')
  })
  it('formats zero', () => {
    expect(formatRupiah(0)).toBe('Rp 0')
  })
  it('formats negatives', () => {
    expect(formatRupiah(-250000)).toBe('-Rp 250.000')
  })
})

describe('parseRupiah', () => {
  it('strips separators and prefix', () => {
    expect(parseRupiah('Rp 1.500.000')).toBe(1500000)
  })
  it('parses bare digits', () => {
    expect(parseRupiah('250000')).toBe(250000)
  })
  it('returns 0 for empty', () => {
    expect(parseRupiah('')).toBe(0)
  })
})
