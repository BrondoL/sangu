import { describe, it, expect } from 'vitest'
import { projectGoal } from './goals'

describe('projectGoal', () => {
  it('computes remaining, months left, and completion month', () => {
    const p = projectGoal({
      targetAmount: 1_500_000_000,
      accumulated: 300_000_000,
      monthlyAmount: 10_000_000,
      currentMonth: '2026-08-01',
      targetDate: '2036-01-01',
    })
    expect(p.remaining).toBe(1_200_000_000)
    expect(p.monthsLeft).toBe(120)
    expect(p.completionMonth).toBe('2036-08-01')
    expect(p.onTrack).toBe(false) // 2036-08 is after 2036-01
  })
  it('handles no target amount', () => {
    const p = projectGoal({
      targetAmount: null, accumulated: 5_000_000, monthlyAmount: 1_000_000,
      currentMonth: '2026-08-01', targetDate: null,
    })
    expect(p.remaining).toBeNull()
    expect(p.completionMonth).toBeNull()
  })
  it('handles zero monthly amount', () => {
    const p = projectGoal({
      targetAmount: 100_000_000, accumulated: 0, monthlyAmount: 0,
      currentMonth: '2026-08-01', targetDate: null,
    })
    expect(p.monthsLeft).toBeNull()
    expect(p.completionMonth).toBeNull()
  })
})
