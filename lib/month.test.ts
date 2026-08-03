import { describe, it, expect } from 'vitest'
import { shiftMonth, toIsoMonth, toMonthParam, formatMonthLabel } from './month'

describe('shiftMonth', () => {
  it('moves forward within a year', () => {
    expect(shiftMonth('2026-08', 1)).toBe('2026-09')
  })
  it('rolls over into the next year', () => {
    expect(shiftMonth('2026-12', 1)).toBe('2027-01')
  })
  it('rolls back into the previous year', () => {
    expect(shiftMonth('2026-01', -1)).toBe('2025-12')
  })
  it('accepts a full ISO date and returns a month param', () => {
    expect(shiftMonth('2026-08-01', -2)).toBe('2026-06')
  })
})

describe('toIsoMonth / toMonthParam', () => {
  it('expands a month param to the first of the month', () => {
    expect(toIsoMonth('2026-08')).toBe('2026-08-01')
  })
  it('leaves a full ISO date alone', () => {
    expect(toIsoMonth('2026-08-01')).toBe('2026-08-01')
  })
  it('truncates an ISO date to a month param', () => {
    expect(toMonthParam('2026-08-01')).toBe('2026-08')
  })
})

describe('formatMonthLabel', () => {
  it('renders the Indonesian month name and year', () => {
    expect(formatMonthLabel('2026-08')).toBe('Agustus 2026')
  })
  it('accepts a full ISO date', () => {
    expect(formatMonthLabel('2026-01-01')).toBe('Januari 2026')
  })
})
