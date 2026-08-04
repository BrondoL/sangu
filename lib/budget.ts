/**
 * Budget control arithmetic. Pure — nothing here touches the database, so all
 * of it is testable. Amounts are integer rupiah throughout.
 */

export interface BudgetLine {
  id: string
  name: string
  budget: number
  spent: number
  remaining: number
  over: number
  /** null when the budget is 0 — there is no ratio to a zero budget. */
  ratio: number | null
  /** 0–1, clamped, ready to use as a progress-bar width. */
  fill: number
}

export interface BudgetMonthSummary {
  lines: BudgetLine[]
  unattachedTotal: number
  totalBudget: number
  totalSpent: number
}

export function summarizeBudgetMonth(input: {
  budgets: { id: string; name: string; amount: number }[]
  spending: { recurringExpenseId: string | null; amount: number }[]
}): BudgetMonthSummary {
  const tracked = new Set(input.budgets.map((b) => b.id))

  const spentBy = new Map<string, number>()
  let unattachedTotal = 0
  for (const s of input.spending) {
    if (s.recurringExpenseId === null) {
      unattachedTotal += s.amount
      continue
    }
    // Spending against a budget that is no longer tracked falls into "tak
    // terduga". Dropping it instead would take money that was really spent off
    // every screen and out of every total while the row sits in the table —
    // untracking a budget must not be able to hide what it cost.
    if (!tracked.has(s.recurringExpenseId)) {
      unattachedTotal += s.amount
      continue
    }
    spentBy.set(
      s.recurringExpenseId,
      (spentBy.get(s.recurringExpenseId) ?? 0) + s.amount
    )
  }

  const lines = input.budgets.map((b) => {
    const spent = spentBy.get(b.id) ?? 0
    return {
      id: b.id,
      name: b.name,
      budget: b.amount,
      spent,
      remaining: Math.max(0, b.amount - spent),
      over: Math.max(0, spent - b.amount),
      ratio: b.amount === 0 ? null : spent / b.amount,
      fill:
        b.amount === 0
          ? spent > 0
            ? 1
            : 0
          : Math.min(1, spent / b.amount),
    }
  })

  return {
    lines,
    unattachedTotal,
    totalBudget: input.budgets.reduce((t, b) => t + b.amount, 0),
    totalSpent: lines.reduce((t, l) => t + l.spent, 0) + unattachedTotal,
  }
}

export interface MonthPoint {
  month: string
  /** null means no snapshot was taken — the month is a gap, not a zero. */
  budget: number | null
  spent: number
}

export interface BudgetSeries {
  id: string
  name: string
  points: MonthPoint[]
}

export function compareAcrossMonths(input: {
  budgets: { id: string; name: string }[]
  snapshots: { recurringExpenseId: string; month: string; amount: number }[]
  spending: { recurringExpenseId: string | null; month: string; amount: number }[]
  months: string[]
}): BudgetSeries[] {
  const key = (id: string, month: string) => `${id} ${month}`

  const budgetAt = new Map(
    input.snapshots.map((s) => [key(s.recurringExpenseId, s.month), s.amount])
  )

  const spentAt = new Map<string, number>()
  for (const s of input.spending) {
    if (s.recurringExpenseId === null) continue
    const k = key(s.recurringExpenseId, s.month)
    spentAt.set(k, (spentAt.get(k) ?? 0) + s.amount)
  }

  return input.budgets.map((b) => ({
    id: b.id,
    name: b.name,
    points: input.months.map((month) => ({
      month,
      budget: budgetAt.get(key(b.id, month)) ?? null,
      spent: spentAt.get(key(b.id, month)) ?? 0,
    })),
  }))
}

export type Adjustment =
  | { kind: 'ok' }
  | { kind: 'raise'; amount: number; months: number }
  | { kind: 'lower'; amount: number; months: number }

const UNDER_USED = 0.6
const ROUND_TO = 10_000

function median(ns: number[]): number {
  const s = [...ns].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

function roundUpTo(n: number, step: number): number {
  return Math.ceil(n / step) * step
}

/**
 * Deliberately dull, and stated on screen next to the verdict. A suggestion you
 * cannot check is a suggestion you cannot trust, and this one changes a real
 * number in the budget.
 */
export function suggestAdjustment(series: BudgetSeries): Adjustment {
  const graded = series.points.filter(
    (p): p is MonthPoint & { budget: number } => p.budget !== null && p.budget > 0
  )
  const recent = graded.slice(-4)
  if (recent.length < 3) return { kind: 'ok' }

  const suggestion = roundUpTo(median(recent.map((p) => p.spent)), ROUND_TO)
  // A suggestion of zero or less is never a budget anyone can accept: the
  // action that writes it rejects a non-positive amount, so offering it would
  // be a button that only ever fails. Months with nothing logged land here.
  if (suggestion <= 0) return { kind: 'ok' }
  if (suggestion === recent[recent.length - 1].budget) return { kind: 'ok' }

  const over = recent.filter((p) => p.spent > p.budget).length
  if (over >= 3) return { kind: 'raise', amount: suggestion, months: recent.length }

  // A month with nothing recorded is not evidence of thrift, it is evidence of
  // not recording. Only a month with real spending can argue for lowering.
  const under = recent.filter(
    (p) => p.spent > 0 && p.spent <= p.budget * UNDER_USED
  ).length
  if (recent.length === 4 && under === 4) {
    return { kind: 'lower', amount: suggestion, months: recent.length }
  }

  return { kind: 'ok' }
}

export interface NoteGroup {
  note: string
  months: number
  total: number
  perMonth: { month: string; total: number }[]
}

const MIN_MONTHS = 3

/**
 * Unattached spending that keeps coming back under the same note is a budget
 * that does not exist yet. Case and padding are ignored so "laundry" and
 * "Laundry" meet; nothing here can make "laundry" meet "cuci baju", which is
 * why the capture form suggests notes already used.
 */
export function groupUnattached(input: {
  spending: { month: string; note: string | null; amount: number }[]
  minMonths?: number
}): NoteGroup[] {
  const minMonths = input.minMonths ?? MIN_MONTHS
  const groups = new Map<
    string,
    { note: string; byMonth: Map<string, number> }
  >()

  for (const s of input.spending) {
    const label = (s.note ?? '').trim()
    if (label === '') continue
    const k = label.toLowerCase()
    const g = groups.get(k) ?? { note: label, byMonth: new Map() }
    g.byMonth.set(s.month, (g.byMonth.get(s.month) ?? 0) + s.amount)
    groups.set(k, g)
  }

  return [...groups.values()]
    .filter((g) => g.byMonth.size >= minMonths)
    .map((g) => {
      const perMonth = [...g.byMonth.entries()]
        .map(([month, total]) => ({ month, total }))
        .sort((a, b) => a.month.localeCompare(b.month))
      return {
        note: g.note,
        months: perMonth.length,
        total: perMonth.reduce((t, m) => t + m.total, 0),
        perMonth,
      }
    })
    .sort((a, b) => b.total - a.total)
}
