import { describe, it, expect } from 'vitest'
import {
  shiftMonth,
  toIsoMonth,
  toMonthParam,
  formatMonthLabel,
  formatDateLabel,
  currentMonthParam,
  monthsBetween,
} from './month'
import { currentDateParam } from './month'

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

describe('currentMonthParam', () => {
  it('uses WIB, not UTC, at the month boundary', () => {
    // 2026-07-31 18:00 UTC is already 2026-08-01 01:00 in Jakarta.
    expect(currentMonthParam(new Date('2026-07-31T18:00:00Z'))).toBe('2026-08')
  })
  it('stays in the current month mid-month', () => {
    expect(currentMonthParam(new Date('2026-08-15T12:00:00Z'))).toBe('2026-08')
  })
})

describe('monthsBetween', () => {
  it('counts whole months forward', () => {
    expect(monthsBetween('2026-08', '2026-11')).toBe(3)
  })
  it('is zero for the same month', () => {
    expect(monthsBetween('2026-08', '2026-08')).toBe(0)
  })
  it('goes negative when the target is earlier', () => {
    expect(monthsBetween('2026-08', '2026-05')).toBe(-3)
  })
  it('crosses years', () => {
    expect(monthsBetween('2025-11', '2026-02')).toBe(3)
  })
  it('accepts full ISO dates and ignores the day', () => {
    expect(monthsBetween('2026-08-01', '2027-08-31')).toBe(12)
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

describe('formatDateLabel', () => {
  it('renders a full ISO date in Indonesian, without a leading zero on the day', () => {
    expect(formatDateLabel('2026-08-22')).toBe('22 Agustus 2026')
    expect(formatDateLabel('2026-01-05')).toBe('5 Januari 2026')
  })
  it('does not shift the day, whatever the machine timezone is', () => {
    // A Date-based formatter would read this as the 31st in a western zone.
    expect(formatDateLabel('2026-12-01')).toBe('1 Desember 2026')
  })
})

describe('currentDateParam', () => {
  it('reads the WIB date, not the UTC one', () => {
    // 2026-08-04T18:30Z is already 2026-08-05 in Jakarta (UTC+7).
    expect(currentDateParam(new Date('2026-08-04T18:30:00Z'))).toBe('2026-08-05')
  })
  it('does not roll forward before the WIB day ends', () => {
    expect(currentDateParam(new Date('2026-08-04T16:59:00Z'))).toBe('2026-08-04')
  })
})
