import { describe, it, expect } from 'vitest'
import { projectInstallment, summarizeInstallments } from './installments'
import { formatMonthLabel, monthsBetween, shiftMonth } from './month'

const CURRENT = '2026-08'

/** A running instalment: started June 2026, so August is payment 3 of 12. */
const RUNNING = {
  monthlyAmount: 1_500_000,
  tenorMonths: 12,
  startMonth: '2026-06-01',
}

describe('projectInstallment', () => {
  it('places the current month in the tenor and counts what is left after it', () => {
    const p = projectInstallment({ ...RUNNING, currentMonth: CURRENT })
    expect(p.paymentNumber).toBe(3)
    expect(p.notStarted).toBe(false)
    expect(p.finished).toBe(false)
    expect(p.lastPaymentMonth).toBe('2027-05-01') // June 2026 + 11
    // 9 payments from September onwards. NOT 10: August's own payment is
    // excluded, which is the whole point of the boundary.
    expect(p.remaining).toBe(13_500_000)
    expect(p.progressRatio).toBe(0.25)
  })

  it('has not started when the start month is still ahead', () => {
    const p = projectInstallment({
      monthlyAmount: 2_000_000,
      tenorMonths: 6,
      startMonth: '2026-09-01',
      currentMonth: CURRENT,
    })
    expect(p.notStarted).toBe(true)
    expect(p.finished).toBe(false)
    expect(p.paymentNumber).toBe(0)
    expect(p.progressRatio).toBe(0)
    // Nothing is due in August, so there is no payment to subtract: the whole
    // tenor is still owed.
    expect(p.remaining).toBe(12_000_000)
    expect(p.lastPaymentMonth).toBe('2027-02-01')
  })

  it('is finished when the last payment was last month', () => {
    const p = projectInstallment({
      monthlyAmount: 1_000_000,
      tenorMonths: 12,
      startMonth: '2025-08-01',
      currentMonth: CURRENT,
    })
    expect(p.finished).toBe(true)
    expect(p.notStarted).toBe(false)
    expect(p.paymentNumber).toBe(12) // clamped, not 13
    expect(p.progressRatio).toBe(1)
    expect(p.remaining).toBe(0)
    expect(p.lastPaymentMonth).toBe('2026-07-01')
  })

  it('is on payment 1 in the month it starts', () => {
    const p = projectInstallment({
      monthlyAmount: 1_000_000,
      tenorMonths: 12,
      startMonth: '2026-08-01',
      currentMonth: CURRENT,
    })
    expect(p.paymentNumber).toBe(1)
    expect(p.notStarted).toBe(false)
    expect(p.finished).toBe(false)
    expect(p.remaining).toBe(11_000_000)
    expect(p.lastPaymentMonth).toBe('2027-07-01')
  })

  it('is still running in the month it finishes, with nothing left after it', () => {
    const p = projectInstallment({
      monthlyAmount: 1_000_000,
      tenorMonths: 12,
      startMonth: '2025-09-01',
      currentMonth: CURRENT,
    })
    // August is payment 12 of 12: the money still leaves the account this
    // month, so it is not lunas yet — but nothing is owed after it.
    expect(p.paymentNumber).toBe(12)
    expect(p.finished).toBe(false)
    expect(p.remaining).toBe(0)
    expect(p.progressRatio).toBe(1)
    expect(p.lastPaymentMonth).toBe('2026-08-01')
  })

  it('handles a tenor of 1: running in its only month, finished the next', () => {
    const one = { monthlyAmount: 4_000_000, tenorMonths: 1, startMonth: '2026-08-01' }
    const now = projectInstallment({ ...one, currentMonth: CURRENT })
    expect(now.paymentNumber).toBe(1)
    expect(now.notStarted).toBe(false)
    expect(now.finished).toBe(false)
    expect(now.remaining).toBe(0)
    expect(now.progressRatio).toBe(1)
    expect(now.lastPaymentMonth).toBe('2026-08-01') // start + 0

    const next = projectInstallment({ ...one, currentMonth: '2026-09' })
    expect(next.finished).toBe(true)
    expect(next.remaining).toBe(0)
  })

  it('handles a monthly amount of 0 without pretending it is settled', () => {
    const p = projectInstallment({
      monthlyAmount: 0,
      tenorMonths: 10,
      startMonth: '2026-06-01',
      currentMonth: CURRENT,
    })
    expect(p.remaining).toBe(0) // owes nothing, because it costs nothing
    expect(p.finished).toBe(false) // but it is still running
    expect(p.paymentNumber).toBe(3)
    expect(p.lastPaymentMonth).toBe('2027-03-01')
  })

  it('crosses the year boundary', () => {
    const p = projectInstallment({
      monthlyAmount: 500_000,
      tenorMonths: 4,
      startMonth: '2026-11-01',
      currentMonth: '2027-01',
    })
    expect(p.paymentNumber).toBe(3)
    expect(p.remaining).toBe(500_000)
    expect(p.lastPaymentMonth).toBe('2027-02-01')
  })

  it('accepts a bare month param as well as an ISO month', () => {
    const iso = projectInstallment({ ...RUNNING, currentMonth: '2026-08-01' })
    const param = projectInstallment({ ...RUNNING, currentMonth: '2026-08' })
    expect(param).toEqual(iso)
  })
})

/**
 * The three figures the Cicilan tab used to compute inline, copied verbatim
 * from the component before the move, asserted against the module across a
 * window of months and tenors. This is what stands in for a browser: the tab's
 * rendered numbers cannot have changed if these agree everywhere.
 */
describe('reproduces the arithmetic the tab used to do inline', () => {
  const legacy = (i: {
    monthly_amount: number
    tenor_months: number
    start_month: string
  }, currentMonth: string) => {
    const elapsed = monthsBetween(i.start_month, currentMonth) + 1
    const paidCount = Math.max(0, Math.min(i.tenor_months, elapsed))
    return {
      paidCount,
      notStarted: elapsed <= 0,
      finished: elapsed > i.tenor_months,
      lastMonth: formatMonthLabel(shiftMonth(i.start_month, i.tenor_months - 1)),
      ratio: paidCount / i.tenor_months,
    }
  }

  const rows = [
    { monthly_amount: 1_500_000, tenor_months: 12, start_month: '2026-06-01' },
    { monthly_amount: 2_000_000, tenor_months: 6, start_month: '2026-09-01' },
    { monthly_amount: 1_000_000, tenor_months: 12, start_month: '2025-08-01' },
    { monthly_amount: 4_000_000, tenor_months: 1, start_month: '2026-08-01' },
    { monthly_amount: 0, tenor_months: 10, start_month: '2026-06-01' },
    { monthly_amount: 750_000, tenor_months: 24, start_month: '2025-11-01' },
  ]
  const months = Array.from({ length: 40 }, (_, n) => shiftMonth('2025-01', n))

  it('agrees on every row in every month', () => {
    for (const month of months) {
      for (const row of rows) {
        const old = legacy(row, month)
        const p = projectInstallment({
          monthlyAmount: row.monthly_amount,
          tenorMonths: row.tenor_months,
          startMonth: row.start_month,
          currentMonth: month,
        })
        expect(p.paymentNumber).toBe(old.paidCount)
        expect(p.notStarted).toBe(old.notStarted)
        expect(p.finished).toBe(old.finished)
        expect(p.progressRatio).toBe(old.ratio)
        // The tab formats the label itself now; the month behind it is the same.
        expect(formatMonthLabel(p.lastPaymentMonth)).toBe(old.lastMonth)
      }
    }
  })

  it('agrees on the register total in every month', () => {
    for (const month of months) {
      const old = rows
        .filter((i) => {
          const { notStarted, finished } = legacy(i, month)
          return !notStarted && !finished
        })
        .reduce((sum, i) => sum + i.monthly_amount, 0)
      const s = summarizeInstallments({
        currentMonth: month,
        installments: rows.map((r) => ({
          monthlyAmount: r.monthly_amount,
          tenorMonths: r.tenor_months,
          startMonth: r.start_month,
        })),
      })
      expect(s.monthlyCommitment).toBe(old)
    }
  })
})

describe('summarizeInstallments', () => {
  it('handles an empty register', () => {
    const s = summarizeInstallments({ installments: [], currentMonth: CURRENT })
    expect(s.totalRemaining).toBe(0)
    expect(s.monthlyCommitment).toBe(0)
    // Not a month: there is no last instalment to finish.
    expect(s.lastPaymentMonth).toBeNull()
    expect(s.outstandingCount).toBe(0)
    expect(s.runningCount).toBe(0)
  })

  it('totals a mixed register', () => {
    const s = summarizeInstallments({
      currentMonth: CURRENT,
      installments: [
        RUNNING, // payment 3 of 12 → 9 × 1.500.000 left, running
        { monthlyAmount: 2_000_000, tenorMonths: 6, startMonth: '2026-09-01' }, // not started → 6 × 2.000.000
        { monthlyAmount: 1_000_000, tenorMonths: 12, startMonth: '2025-08-01' }, // finished → nothing
      ],
    })
    expect(s.totalRemaining).toBe(13_500_000 + 12_000_000)
    // Only the running one leaves the account this month: the finished one has
    // stopped generating, the future one has not begun.
    expect(s.monthlyCommitment).toBe(1_500_000)
    expect(s.outstandingCount).toBe(2)
    expect(s.runningCount).toBe(1)
    // February 2027 (the not-started one) is earlier than May 2027.
    expect(s.lastPaymentMonth).toBe('2027-05-01')
  })

  it('takes the last finish month from whichever settles latest, started or not', () => {
    const s = summarizeInstallments({
      currentMonth: CURRENT,
      installments: [
        RUNNING, // ends 2027-05
        { monthlyAmount: 300_000, tenorMonths: 24, startMonth: '2026-10-01' }, // ends 2028-09
        { monthlyAmount: 900_000, tenorMonths: 3, startMonth: '2026-07-01' }, // ends 2026-09
      ],
    })
    expect(s.lastPaymentMonth).toBe('2028-09-01')
  })

  it('says nothing about a finish month when every instalment is lunas', () => {
    const s = summarizeInstallments({
      currentMonth: CURRENT,
      installments: [
        { monthlyAmount: 1_000_000, tenorMonths: 12, startMonth: '2025-08-01' },
        { monthlyAmount: 5_000_000, tenorMonths: 3, startMonth: '2024-01-01' },
      ],
    })
    expect(s.totalRemaining).toBe(0)
    expect(s.monthlyCommitment).toBe(0)
    expect(s.lastPaymentMonth).toBeNull()
    expect(s.outstandingCount).toBe(0)
    expect(s.runningCount).toBe(0)
  })

  it('counts a 0-rupiah instalment as running and dates it, without adding money', () => {
    const s = summarizeInstallments({
      currentMonth: CURRENT,
      installments: [{ monthlyAmount: 0, tenorMonths: 10, startMonth: '2026-06-01' }],
    })
    expect(s.totalRemaining).toBe(0)
    expect(s.monthlyCommitment).toBe(0)
    expect(s.runningCount).toBe(1)
    expect(s.outstandingCount).toBe(1)
    expect(s.lastPaymentMonth).toBe('2027-03-01')
  })

  it('still counts an instalment in its final month as this month\'s commitment', () => {
    const s = summarizeInstallments({
      currentMonth: CURRENT,
      installments: [
        { monthlyAmount: 1_000_000, tenorMonths: 12, startMonth: '2025-09-01' },
      ],
    })
    expect(s.monthlyCommitment).toBe(1_000_000)
    expect(s.totalRemaining).toBe(0)
    expect(s.runningCount).toBe(1)
    expect(s.lastPaymentMonth).toBe('2026-08-01')
  })

  it('keeps the two figures on opposite sides of this month, so they add up', () => {
    const installments = [
      RUNNING,
      { monthlyAmount: 2_000_000, tenorMonths: 6, startMonth: '2026-09-01' },
    ]
    const s = summarizeInstallments({ installments, currentMonth: CURRENT })
    // Everything still to leave the account, counting August itself: 10 more
    // payments on the running one plus all 6 of the one starting next month.
    expect(s.totalRemaining + s.monthlyCommitment).toBe(
      10 * 1_500_000 + 6 * 2_000_000
    )
  })

  it('agrees with the per-instalment projection it is built from', () => {
    const installments = [
      RUNNING,
      { monthlyAmount: 750_000, tenorMonths: 18, startMonth: '2026-01-01' },
      { monthlyAmount: 2_000_000, tenorMonths: 6, startMonth: '2026-09-01' },
      { monthlyAmount: 1_000_000, tenorMonths: 12, startMonth: '2025-08-01' },
    ]
    const s = summarizeInstallments({ installments, currentMonth: CURRENT })
    const perItem = installments
      .map((i) => projectInstallment({ ...i, currentMonth: CURRENT }))
      .reduce((t, p) => t + p.remaining, 0)
    expect(s.totalRemaining).toBe(perItem)
  })
})
