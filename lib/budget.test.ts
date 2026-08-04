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

import { compareAcrossMonths } from './budget'

describe('compareAcrossMonths', () => {
  const budgets = [{ id: 'jajan', name: 'Jajan' }]
  const months = ['2026-05', '2026-06', '2026-07', '2026-08']

  it('marks a month that was never snapshotted as a gap, not a zero', () => {
    const [series] = compareAcrossMonths({
      budgets,
      snapshots: [
        { recurringExpenseId: 'jajan', month: '2026-05', amount: 1_750_000 },
        { recurringExpenseId: 'jajan', month: '2026-07', amount: 1_750_000 },
      ],
      spending: [{ recurringExpenseId: 'jajan', month: '2026-05', amount: 1_800_000 }],
      months,
    })
    expect(series.points.map((p) => p.budget)).toEqual([
      1_750_000,
      null,
      1_750_000,
      null,
    ])
    expect(series.points[1].spent).toBe(0)
  })

  it('holds the budget that applied then, not the one that applies now', () => {
    const [series] = compareAcrossMonths({
      budgets,
      snapshots: [
        { recurringExpenseId: 'jajan', month: '2026-07', amount: 1_750_000 },
        { recurringExpenseId: 'jajan', month: '2026-08', amount: 2_000_000 },
      ],
      spending: [],
      months,
    })
    expect(series.points[2].budget).toBe(1_750_000)
    expect(series.points[3].budget).toBe(2_000_000)
  })

  it('sums spending per month and keeps months oldest first', () => {
    const [series] = compareAcrossMonths({
      budgets,
      snapshots: months.map((month) => ({
        recurringExpenseId: 'jajan',
        month,
        amount: 1_750_000,
      })),
      spending: [
        { recurringExpenseId: 'jajan', month: '2026-08', amount: 100_000 },
        { recurringExpenseId: 'jajan', month: '2026-08', amount: 40_000 },
        { recurringExpenseId: 'jajan', month: '2026-05', amount: 900_000 },
        { recurringExpenseId: null, month: '2026-08', amount: 500_000 },
      ],
      months,
    })
    expect(series.points.map((p) => p.month)).toEqual(months)
    expect(series.points.map((p) => p.spent)).toEqual([900_000, 0, 0, 140_000])
  })

  it('still records spending in a month that was never snapshotted', () => {
    const [series] = compareAcrossMonths({
      budgets,
      snapshots: [
        { recurringExpenseId: 'jajan', month: '2026-07', amount: 1_750_000 },
      ],
      spending: [
        { recurringExpenseId: 'jajan', month: '2026-06', amount: 1_320_000 },
      ],
      months,
    })
    const june = series.points.find((p) => p.month === '2026-06')!
    // The budget is unknown, but the money was still spent. Reporting 0 here
    // would turn a month the user forgot to set up into a month they lived free.
    expect(june.budget).toBeNull()
    expect(june.spent).toBe(1_320_000)
  })
})

import { suggestAdjustment } from './budget'
import type { BudgetSeries } from './budget'

const series = (points: [string, number | null, number][]): BudgetSeries => ({
  id: 'jajan',
  name: 'Jajan',
  points: points.map(([month, budget, spent]) => ({ month, budget, spent })),
})

describe('suggestAdjustment', () => {
  it('suggests raising when over budget in three of the last four months', () => {
    const a = suggestAdjustment(
      series([
        ['2026-05', 1_750_000, 1_800_000],
        ['2026-06', 1_750_000, 1_950_000],
        ['2026-07', 1_750_000, 1_760_000],
        ['2026-08', 1_750_000, 1_900_000],
      ])
    )
    expect(a).toEqual({ kind: 'raise', amount: 1_850_000, months: 4 })
  })

  it('suggests lowering when 60% or less is used four months running', () => {
    const a = suggestAdjustment(
      series([
        ['2026-05', 500_000, 200_000],
        ['2026-06', 500_000, 250_000],
        ['2026-07', 500_000, 180_000],
        ['2026-08', 500_000, 300_000],
      ])
    )
    expect(a).toEqual({ kind: 'lower', amount: 230_000, months: 4 })
  })

  it('says nothing when the months disagree', () => {
    const a = suggestAdjustment(
      series([
        ['2026-05', 1_750_000, 1_800_000],
        ['2026-06', 1_750_000, 1_200_000],
        ['2026-07', 1_750_000, 1_900_000],
        ['2026-08', 1_750_000, 1_500_000],
      ])
    )
    expect(a).toEqual({ kind: 'ok' })
  })

  it('will not rule on fewer than three recorded months', () => {
    const a = suggestAdjustment(
      series([
        ['2026-05', null, 0],
        ['2026-06', null, 0],
        ['2026-07', 1_750_000, 1_900_000],
        ['2026-08', 1_750_000, 1_950_000],
      ])
    )
    expect(a).toEqual({ kind: 'ok' })
  })

  it('ignores gap months rather than reading them as zero spend', () => {
    const a = suggestAdjustment(
      series([
        ['2026-05', 500_000, 200_000],
        ['2026-06', null, 0],
        ['2026-07', 500_000, 250_000],
        ['2026-08', 500_000, 180_000],
      ])
    )
    // Three graded months, all well under, but 'lower' needs four.
    expect(a).toEqual({ kind: 'ok' })
  })

  it('stays quiet when the suggestion is the budget already set', () => {
    const a = suggestAdjustment(
      series([
        ['2026-05', 1_000_000, 1_000_000],
        ['2026-06', 1_000_000, 1_000_000],
        ['2026-07', 1_000_000, 1_000_000],
        ['2026-08', 1_000_000, 1_000_000],
      ])
    )
    expect(a).toEqual({ kind: 'ok' })
  })

  it('skips budgets of zero, which have nothing to be over', () => {
    const a = suggestAdjustment(
      series([
        ['2026-05', 0, 50_000],
        ['2026-06', 0, 60_000],
        ['2026-07', 0, 70_000],
        ['2026-08', 0, 80_000],
      ])
    )
    expect(a).toEqual({ kind: 'ok' })
  })
})

import { groupUnattached } from './budget'

describe('groupUnattached', () => {
  it('groups a recurring note across months, keeping the spelling first seen', () => {
    const groups = groupUnattached({
      spending: [
        { month: '2026-06', note: 'laundry', amount: 45_000 },
        { month: '2026-07', note: 'Laundry', amount: 50_000 },
        { month: '2026-08', note: '  LAUNDRY  ', amount: 55_000 },
      ],
    })
    expect(groups).toHaveLength(1)
    // First seen, not last: an implementation that overwrote the label on every
    // match would report 'LAUNDRY' here and the grouping would still look right.
    expect(groups[0].note).toBe('laundry')
    expect(groups[0].months).toBe(3)
    expect(groups[0].total).toBe(150_000)
    expect(groups[0].perMonth).toEqual([
      { month: '2026-06', total: 45_000 },
      { month: '2026-07', total: 50_000 },
      { month: '2026-08', total: 55_000 },
    ])
  })

  it('drops a note that has not recurred in enough months', () => {
    const groups = groupUnattached({
      spending: [
        { month: '2026-07', note: 'Servis kipas', amount: 122_000 },
        { month: '2026-08', note: 'Servis kipas', amount: 90_000 },
      ],
    })
    expect(groups).toEqual([])
  })

  it('counts months, not entries', () => {
    const groups = groupUnattached({
      spending: [
        { month: '2026-08', note: 'Parkir', amount: 5_000 },
        { month: '2026-08', note: 'Parkir', amount: 5_000 },
        { month: '2026-08', note: 'Parkir', amount: 5_000 },
      ],
    })
    expect(groups).toEqual([])
  })

  it('skips entries with no note at all', () => {
    const groups = groupUnattached({
      spending: [
        { month: '2026-06', note: null, amount: 10_000 },
        { month: '2026-07', note: '   ', amount: 10_000 },
        { month: '2026-08', note: '', amount: 10_000 },
      ],
    })
    expect(groups).toEqual([])
  })

  it('sorts the biggest total first', () => {
    const months = ['2026-06', '2026-07', '2026-08']
    const groups = groupUnattached({
      spending: [
        ...months.map((month) => ({ month, note: 'Laundry', amount: 50_000 })),
        ...months.map((month) => ({ month, note: 'Galon', amount: 120_000 })),
      ],
    })
    expect(groups.map((g) => g.note)).toEqual(['Galon', 'Laundry'])
  })
})
