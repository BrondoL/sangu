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
    // Spending against an untracked budget belongs to neither column: counting
    // it as unattached would invent an expense the user never called surprise.
    if (!tracked.has(s.recurringExpenseId)) continue
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
