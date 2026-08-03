import { describe, it, expect } from 'vitest'
import { planNewMonthItems, isInstallmentActive } from './generate'
import type { GenerateInput } from './types'

const empty = (over: Partial<GenerateInput>): GenerateInput => ({
  targetMonth: '2026-08-01',
  recurringExpenses: [],
  installments: [],
  savingsGoals: [],
  creditCardAccountIds: [],
  previousItems: null,
  existingSourceIds: new Set(),
  existingCardBillAccountIds: new Set(),
  ...over,
})

describe('isInstallmentActive', () => {
  it('true within tenor window', () => {
    expect(isInstallmentActive('2026-01-01', 12, '2026-08-01')).toBe(true)
  })
  it('true on the last month exactly', () => {
    expect(isInstallmentActive('2026-01-01', 8, '2026-08-01')).toBe(true)
  })
  it('false after tenor ends', () => {
    expect(isInstallmentActive('2026-01-01', 7, '2026-08-01')).toBe(false)
  })
  it('false before start', () => {
    expect(isInstallmentActive('2026-09-01', 12, '2026-08-01')).toBe(false)
  })
})

describe('planNewMonthItems', () => {
  it('inherits recurring amount from previous month when present', () => {
    const items = planNewMonthItems(
      empty({
        recurringExpenses: [
          { id: 'r1', name: 'Listrik', defaultAmount: 300_000, accountId: 'a', paymentMethod: 'debit' },
        ],
        previousItems: [{ sourceType: 'recurring', sourceId: 'r1', amount: 340_000 }],
      })
    )
    expect(items[0].amount).toBe(340_000)
  })

  it('falls back to definition default when no previous match', () => {
    const items = planNewMonthItems(
      empty({
        recurringExpenses: [
          { id: 'r1', name: 'Listrik', defaultAmount: 300_000, accountId: 'a', paymentMethod: 'debit' },
        ],
        previousItems: [],
      })
    )
    expect(items[0].amount).toBe(300_000)
  })

  it('installments always use definition amount, never inherited', () => {
    const items = planNewMonthItems(
      empty({
        installments: [
          { id: 'i1', name: 'Motor', monthlyAmount: 1_000_000, tenorMonths: 12, startMonth: '2026-01-01', accountId: 'a', paymentMethod: 'debit' },
        ],
        previousItems: [{ sourceType: 'installment', sourceId: 'i1', amount: 999_999 }],
      })
    )
    expect(items[0].amount).toBe(1_000_000)
  })

  it('excludes installments past their tenor', () => {
    const items = planNewMonthItems(
      empty({
        installments: [
          { id: 'i1', name: 'Motor', monthlyAmount: 1_000_000, tenorMonths: 7, startMonth: '2026-01-01', accountId: 'a', paymentMethod: 'debit' },
        ],
      })
    )
    expect(items).toHaveLength(0)
  })

  it('creates a zero card_bill per credit-card account', () => {
    const items = planNewMonthItems(empty({ creditCardAccountIds: ['mandiri', 'bca'] }))
    const bills = items.filter((i) => i.category === 'card_bill')
    expect(bills).toHaveLength(2)
    expect(bills.every((b) => b.amount === 0)).toBe(true)
  })

  it('is idempotent — skips source ids and card-bill accounts already present', () => {
    const items = planNewMonthItems(
      empty({
        recurringExpenses: [
          { id: 'r1', name: 'Listrik', defaultAmount: 300_000, accountId: 'a', paymentMethod: 'debit' },
        ],
        creditCardAccountIds: ['mandiri'],
        existingSourceIds: new Set(['r1']),
        existingCardBillAccountIds: new Set(['mandiri']),
      })
    )
    expect(items).toHaveLength(0)
  })
})
