import { describe, it, expect } from 'vitest'
import { terbilang, terbilangRupiah } from './terbilang'

describe('terbilang', () => {
  it('spells the single digits', () => {
    expect(terbilang(0)).toBe('nol')
    expect(terbilang(1)).toBe('satu')
    expect(terbilang(9)).toBe('sembilan')
  })

  it('uses the se- forms rather than "satu"', () => {
    expect(terbilang(10)).toBe('sepuluh')
    expect(terbilang(11)).toBe('sebelas')
    expect(terbilang(100)).toBe('seratus')
    expect(terbilang(1_000)).toBe('seribu')
  })

  it('spells the teens and tens', () => {
    expect(terbilang(12)).toBe('dua belas')
    expect(terbilang(19)).toBe('sembilan belas')
    expect(terbilang(20)).toBe('dua puluh')
    expect(terbilang(21)).toBe('dua puluh satu')
    expect(terbilang(99)).toBe('sembilan puluh sembilan')
  })

  it('spells hundreds and thousands', () => {
    expect(terbilang(101)).toBe('seratus satu')
    expect(terbilang(250)).toBe('dua ratus lima puluh')
    expect(terbilang(1_500)).toBe('seribu lima ratus')
    expect(terbilang(2_000)).toBe('dua ribu')
    expect(terbilang(15_750)).toBe('lima belas ribu tujuh ratus lima puluh')
  })

  it('keeps "satu juta" — juta and above never take se-', () => {
    expect(terbilang(1_000_000)).toBe('satu juta')
    expect(terbilang(1_000_000_000)).toBe('satu miliar')
    expect(terbilang(1_000_000_000_000)).toBe('satu triliun')
  })

  it('spells the amounts this app actually shows', () => {
    expect(terbilang(20_500_000)).toBe('dua puluh juta lima ratus ribu')
    expect(terbilang(15_000_000)).toBe('lima belas juta')
    expect(terbilang(11_000_000)).toBe('sebelas juta')
    expect(terbilang(1_500_000_000)).toBe('satu miliar lima ratus juta')
    expect(terbilang(8_500_000)).toBe('delapan juta lima ratus ribu')
  })

  it('prefixes negatives with minus', () => {
    expect(terbilang(-2_500)).toBe('minus dua ribu lima ratus')
  })

  it('ignores any fractional rupiah rather than spelling it', () => {
    expect(terbilang(1_500.7)).toBe('seribu lima ratus satu')
  })
})

describe('terbilangRupiah', () => {
  it('appends the currency and capitalises the sentence', () => {
    expect(terbilangRupiah(20_500_000)).toBe(
      'Dua puluh juta lima ratus ribu rupiah'
    )
    expect(terbilangRupiah(0)).toBe('Nol rupiah')
  })
})
