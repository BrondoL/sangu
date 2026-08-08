import { describe, it, expect } from 'vitest'
import { describePeriodContents } from './period-summary'
import type { PeriodContents } from './period-summary'

const nothing: PeriodContents = {
  itemCount: 0,
  paidCount: 0,
  balanceCount: 0,
  hasActualSalary: false,
  hasNote: false,
}

describe('describePeriodContents', () => {
  it('names every part of a full month, separated by a middle dot', () => {
    expect(
      describePeriodContents({
        itemCount: 12,
        paidCount: 3,
        balanceCount: 4,
        hasActualSalary: true,
        hasNote: true,
      })
    ).toBe('12 item, 3 lunas · gaji riil terisi · saldo 4 rekening · ada catatan')
  })

  it('leaves out the lunas clause when nothing is paid', () => {
    expect(describePeriodContents({ ...nothing, itemCount: 12 })).toBe('12 item')
  })

  it('names only the parts that are there', () => {
    expect(describePeriodContents({ ...nothing, hasActualSalary: true })).toBe(
      'gaji riil terisi'
    )
  })

  it('omits a zero balance count', () => {
    expect(
      describePeriodContents({ ...nothing, itemCount: 5, balanceCount: 0 })
    ).toBe('5 item')
  })

  it('says the month is empty when there is nothing at all', () => {
    expect(describePeriodContents(nothing)).toBe('bulan ini masih kosong')
  })
})
