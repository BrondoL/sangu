import { describe, it, expect } from 'vitest'
import { summarizeBudgetMonth } from './budget'

describe('summarizeBudgetMonth', () => {
  const budgets = [
    { id: 'jajan', name: 'Jajan', amount: 1_750_000 },
    { id: 'makan', name: 'Makan', amount: 1_000_000 },
    { id: 'reward', name: 'Self Reward Nabil', amount: 0 },
  ]

  it('sums spending per budget and splits remaining from over', () => {
    const s = summarizeBudgetMonth({
      budgets,
      spending: [
        { recurringExpenseId: 'jajan', amount: 1_000_000 },
        { recurringExpenseId: 'jajan', amount: 240_000 },
        { recurringExpenseId: 'makan', amount: 1_180_000 },
      ],
    })
    const jajan = s.lines.find((l) => l.id === 'jajan')!
    expect(jajan.spent).toBe(1_240_000)
    expect(jajan.remaining).toBe(510_000)
    expect(jajan.over).toBe(0)

    const makan = s.lines.find((l) => l.id === 'makan')!
    expect(makan.over).toBe(180_000)
    expect(makan.remaining).toBe(0)
  })

  it('reports a zero budget without dividing by zero', () => {
    const s = summarizeBudgetMonth({
      budgets,
      spending: [{ recurringExpenseId: 'reward', amount: 75_000 }],
    })
    const reward = s.lines.find((l) => l.id === 'reward')!
    expect(reward.spent).toBe(75_000)
    expect(reward.ratio).toBeNull()
    expect(reward.over).toBe(75_000)
  })

  it('keeps unattached spending out of every budget line', () => {
    const s = summarizeBudgetMonth({
      budgets,
      spending: [
        { recurringExpenseId: null, amount: 45_000 },
        { recurringExpenseId: null, amount: 122_000 },
        { recurringExpenseId: 'jajan', amount: 10_000 },
      ],
    })
    expect(s.unattachedTotal).toBe(167_000)
    expect(s.totalSpent).toBe(177_000)
    expect(s.lines.find((l) => l.id === 'jajan')!.spent).toBe(10_000)
  })

  it('keeps a budget with no spending at zero rather than dropping it', () => {
    const s = summarizeBudgetMonth({ budgets, spending: [] })
    expect(s.lines).toHaveLength(3)
    expect(s.lines.every((l) => l.spent === 0)).toBe(true)
    expect(s.totalBudget).toBe(2_750_000)
  })

  it('ignores spending pointing at a budget that is not tracked', () => {
    const s = summarizeBudgetMonth({
      budgets,
      spending: [{ recurringExpenseId: 'listrik', amount: 500_000 }],
    })
    expect(s.lines.every((l) => l.spent === 0)).toBe(true)
    expect(s.unattachedTotal).toBe(0)
    expect(s.totalSpent).toBe(0)
  })

  it('reports the raw ratio, unclamped, so an overspend can be read as a percentage', () => {
    const s = summarizeBudgetMonth({
      budgets,
      spending: [
        { recurringExpenseId: 'makan', amount: 1_180_000 },
        { recurringExpenseId: 'jajan', amount: 1_240_000 },
      ],
    })
    expect(s.lines.find((l) => l.id === 'makan')!.ratio).toBeCloseTo(1.18, 5)
    expect(s.lines.find((l) => l.id === 'jajan')!.ratio).toBeCloseTo(0.708571, 5)
  })

  it('clamps fill at 1 so an overspent bar cannot outgrow its container', () => {
    const s = summarizeBudgetMonth({
      budgets,
      spending: [
        { recurringExpenseId: 'makan', amount: 1_180_000 },
        { recurringExpenseId: 'jajan', amount: 1_240_000 },
      ],
    })
    expect(s.lines.find((l) => l.id === 'makan')!.fill).toBe(1)
    expect(s.lines.find((l) => l.id === 'jajan')!.fill).toBeCloseTo(0.708571, 5)
  })

  it('fills a zero budget only once something is spent against it', () => {
    const spent = summarizeBudgetMonth({
      budgets,
      spending: [{ recurringExpenseId: 'reward', amount: 75_000 }],
    })
    expect(spent.lines.find((l) => l.id === 'reward')!.fill).toBe(1)

    const untouched = summarizeBudgetMonth({ budgets, spending: [] })
    expect(untouched.lines.find((l) => l.id === 'reward')!.fill).toBe(0)
  })
})
