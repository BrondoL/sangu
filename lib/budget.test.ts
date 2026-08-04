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

  it('surfaces spending on an untracked budget as tak terduga instead of making it disappear', () => {
    const s = summarizeBudgetMonth({
      budgets,
      spending: [{ recurringExpenseId: 'listrik', amount: 500_000 }],
    })
    // No line can claim it — 'listrik' is not tracked here — but the money was
    // still spent, so it has to land somewhere the user can see and delete it.
    expect(s.lines.every((l) => l.spent === 0)).toBe(true)
    expect(s.unattachedTotal).toBe(500_000)
    expect(s.totalSpent).toBe(500_000)
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

  it('reports the spend but no budget when the month was never snapshotted', () => {
    const s = summarizeBudgetMonth({
      budgets: [{ id: 'jajan', name: 'Jajan', amount: null }],
      spending: [
        { recurringExpenseId: 'jajan', amount: 2_000_000 },
        { recurringExpenseId: 'jajan', amount: 400_000 },
      ],
    })
    const jajan = s.lines[0]
    // The money was really spent, so it is reported. The budget was never
    // recorded for this month, so nothing may be claimed against it — an
    // unrecorded budget is a gap, and "Lebih 400.000" against today's figure
    // is a verdict on a month that figure never applied to.
    expect(jajan.spent).toBe(2_400_000)
    expect(jajan.budget).toBeNull()
    expect(jajan.remaining).toBeNull()
    expect(jajan.over).toBeNull()
  })

  it('never divides by an unrecorded budget', () => {
    const s = summarizeBudgetMonth({
      budgets: [{ id: 'jajan', name: 'Jajan', amount: null }],
      spending: [{ recurringExpenseId: 'jajan', amount: 2_400_000 }],
    })
    // No ratio, and a bar that draws nothing rather than a full red one.
    expect(s.lines[0].ratio).toBeNull()
    expect(s.lines[0].fill).toBe(0)
  })

  it('leaves an unrecorded budget out of the month total budget', () => {
    const s = summarizeBudgetMonth({
      budgets: [
        { id: 'jajan', name: 'Jajan', amount: null },
        { id: 'makan', name: 'Makan', amount: 1_000_000 },
      ],
      spending: [
        { recurringExpenseId: 'jajan', amount: 2_400_000 },
        { recurringExpenseId: null, amount: 50_000 },
      ],
    })
    // A budget nobody recorded contributes no number to a sum of budgets.
    expect(s.totalBudget).toBe(1_000_000)
    // Its spending still counts, though — it is money that left the account.
    expect(s.totalSpent).toBe(2_450_000)
  })

  it('tells an unrecorded budget apart from a budget of zero', () => {
    const s = summarizeBudgetMonth({
      budgets: [
        { id: 'gap', name: 'Belum tercatat', amount: null },
        { id: 'zero', name: 'Self Reward Nabil', amount: 0 },
      ],
      spending: [
        { recurringExpenseId: 'gap', amount: 75_000 },
        { recurringExpenseId: 'zero', amount: 75_000 },
      ],
    })
    const gap = s.lines.find((l) => l.id === 'gap')!
    const zero = s.lines.find((l) => l.id === 'zero')!
    // A budget of zero is a decision: everything spent against it is over.
    expect(zero.budget).toBe(0)
    expect(zero.over).toBe(75_000)
    // A budget never recorded is not that decision, and says nothing.
    expect(gap.budget).toBeNull()
    expect(gap.over).toBeNull()
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

  it('says nothing when four snapshotted months hold no spending at all', () => {
    const a = suggestAdjustment(
      series([
        ['2026-05', 1_750_000, 0],
        ['2026-06', 1_750_000, 0],
        ['2026-07', 1_750_000, 0],
        ['2026-08', 1_750_000, 0],
      ])
    )
    // The median of four zeroes is zero, and "ubah jadi Rp 0" is a change the
    // write action refuses. Four months of silence means the recording stopped,
    // not that the budget should be abolished.
    expect(a).toEqual({ kind: 'ok' })
  })

  it('will not lower on the strength of months where nothing was recorded', () => {
    const a = suggestAdjustment(
      series([
        ['2026-05', 500_000, 200_000],
        ['2026-06', 500_000, 0],
        ['2026-07', 500_000, 250_000],
        ['2026-08', 500_000, 180_000],
      ])
    )
    // Three real months well under, one empty. An empty month is missing data,
    // so it cannot be the fourth vote for lowering.
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

  it('does not grade the month still being lived', () => {
    // Two days into August: 40.000 of a 1.000.000 budget, against three full
    // months that each landed comfortably inside it.
    const points: [string, number | null, number][] = [
      ['2026-05', 1_000_000, 590_000],
      ['2026-06', 1_000_000, 580_000],
      ['2026-07', 1_000_000, 560_000],
      ['2026-08', 1_000_000, 40_000],
    ]
    // Counting August, the part-month is the fourth vote for lowering and it
    // also pulls the median under every full month's spend.
    expect(suggestAdjustment(series(points))).toEqual({
      kind: 'lower',
      amount: 570_000,
      months: 4,
    })
    // Excluded, only the three finished months are read. They are all under
    // 60%, but three is not the four 'lower' needs, and the budget is running
    // fine — so nothing is offered.
    expect(suggestAdjustment(series(points), '2026-08')).toEqual({ kind: 'ok' })
  })

  it('lets an accepted suggestion retire instead of immediately offering another', () => {
    // August has not been opened yet, so it carries no snapshot.
    const before: [string, number | null, number][] = [
      ['2026-04', 1_000_000, 5_000_000],
      ['2026-05', 1_000_000, 1_100_000],
      ['2026-06', 1_000_000, 1_200_000],
      ['2026-07', 1_000_000, 1_300_000],
      ['2026-08', null, 0],
    ]
    expect(suggestAdjustment(series(before), '2026-08')).toEqual({
      kind: 'raise',
      amount: 1_250_000,
      months: 4,
    })

    // Accepting writes 1.250.000 into the definition and into August's
    // snapshot, which is the month still being lived.
    const after: [string, number | null, number][] = [
      ...before.slice(0, 4),
      ['2026-08', 1_250_000, 0],
    ]
    expect(suggestAdjustment(series(after), '2026-08')).toEqual({ kind: 'ok' })

    // Without the exclusion the accept never lands: August joins the window and
    // shifts it off April, so the median falls to 1.150.000 while May, June and
    // July are still over — a smaller figure offered as a raise, one tap after
    // the larger one was accepted.
    expect(suggestAdjustment(series(after))).toEqual({
      kind: 'raise',
      amount: 1_150_000,
      months: 4,
    })
  })

  it('leaves the excluded month in the series the caller renders', () => {
    // The history table shows six months; only the grading window is narrower.
    const s = series([
      ['2026-05', 1_000_000, 590_000],
      ['2026-06', 1_000_000, 580_000],
      ['2026-07', 1_000_000, 560_000],
      ['2026-08', 1_000_000, 40_000],
    ])
    suggestAdjustment(s, '2026-08')
    expect(s.points.map((p) => p.month)).toEqual([
      '2026-05',
      '2026-06',
      '2026-07',
      '2026-08',
    ])
    expect(s.points[3]).toEqual({ month: '2026-08', budget: 1_000_000, spent: 40_000 })
  })

  it('grades the same way when no month is excluded or the named month is absent', () => {
    const points: [string, number | null, number][] = [
      ['2026-05', 1_750_000, 1_800_000],
      ['2026-06', 1_750_000, 1_950_000],
      ['2026-07', 1_750_000, 1_760_000],
      ['2026-08', 1_750_000, 1_900_000],
    ]
    const omitted = suggestAdjustment(series(points))
    // A month outside the window names nothing, so it removes nothing.
    const absent = suggestAdjustment(series(points), '2026-01')
    expect(omitted).toEqual({ kind: 'raise', amount: 1_850_000, months: 4 })
    expect(absent).toEqual(omitted)
  })

  it('stays silent when excluding the month in progress leaves thin evidence', () => {
    // Three recorded months, one of them the one being lived. Two finished
    // months is not enough to rule on a budget, so it does not rule.
    const a = suggestAdjustment(
      series([
        ['2026-06', 1_000_000, 1_200_000],
        ['2026-07', 1_000_000, 1_300_000],
        ['2026-08', 1_000_000, 1_400_000],
      ]),
      '2026-08'
    )
    expect(a).toEqual({ kind: 'ok' })
  })
})

import { poolUnattached, groupUnattached } from './budget'

describe('poolUnattached', () => {
  it('pools spending on a budget that is no longer rendered, not only the unattached', () => {
    const pool = poolUnattached({
      spending: [
        { recurringExpenseId: null, month: '2026-07', note: 'Laundry', amount: 45_000 },
        // 'listrik' was untracked: it has no series on the page, so nothing
        // else on the page can show this money.
        { recurringExpenseId: 'listrik', month: '2026-07', note: null, amount: 500_000 },
        { recurringExpenseId: 'jajan', month: '2026-07', note: null, amount: 25_000 },
      ],
      budgetIds: ['jajan', 'makan'],
    })
    expect(pool.spending.map((s) => s.amount)).toEqual([45_000, 500_000])
    expect(pool.total).toBe(545_000)
  })

  it('leaves a rendered budget alone, so a retired one is never counted twice', () => {
    // A retired budget that is still tracked keeps its own series and its
    // "Non-aktif" badge. Pooling it here would show its spending in two places.
    const pool = poolUnattached({
      spending: [
        { recurringExpenseId: 'skincare', month: '2026-06', note: null, amount: 120_000 },
      ],
      budgetIds: ['jajan', 'skincare'],
    })
    expect(pool.spending).toEqual([])
    expect(pool.total).toBe(0)
  })

  it('totals rows that no note grouping will ever surface', () => {
    const spending = [
      { recurringExpenseId: null, month: '2026-06', note: null, amount: 80_000 },
      { recurringExpenseId: null, month: '2026-07', note: '   ', amount: 60_000 },
      { recurringExpenseId: 'listrik', month: '2026-08', note: null, amount: 500_000 },
    ]
    const pool = poolUnattached({ spending, budgetIds: ['jajan'] })
    // Nothing here has a note that repeats, so the section lists nothing — the
    // total is the only place this 640.000 is visible.
    expect(groupUnattached({ spending: pool.spending })).toEqual([])
    expect(pool.total).toBe(640_000)
  })

  it('keeps the shape groupUnattached reads, so the two stay in step', () => {
    const pool = poolUnattached({
      spending: ['2026-06', '2026-07', '2026-08'].map((month) => ({
        recurringExpenseId: 'listrik',
        month,
        note: 'Listrik',
        amount: 300_000,
      })),
      budgetIds: [],
    })
    // Spending on an untracked budget can name a budget you are missing just as
    // well as spending that never had one.
    expect(groupUnattached({ spending: pool.spending })).toEqual([
      {
        note: 'Listrik',
        months: 3,
        total: 900_000,
        perMonth: [
          { month: '2026-06', total: 300_000 },
          { month: '2026-07', total: 300_000 },
          { month: '2026-08', total: 300_000 },
        ],
      },
    ])
  })
})

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
