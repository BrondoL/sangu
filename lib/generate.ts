import type { GenerateInput, PlannedItem, PreviousItem } from './types'

function monthIndex(iso: string): number {
  // 'YYYY-MM-01' -> absolute month number
  const [y, m] = iso.split('-').map(Number)
  return y * 12 + (m - 1)
}

export function isInstallmentActive(
  startMonth: string,
  tenor: number,
  targetMonth: string
): boolean {
  const start = monthIndex(startMonth)
  const target = monthIndex(targetMonth)
  return target >= start && target <= start + tenor - 1
}

function inheritedAmount(
  previous: PreviousItem[] | null,
  sourceId: string,
  fallback: number
): number {
  const match = previous?.find((p) => p.sourceId === sourceId)
  return match ? match.amount : fallback
}

export function planNewMonthItems(input: GenerateInput): PlannedItem[] {
  const {
    targetMonth,
    recurringExpenses,
    installments,
    savingsGoals,
    creditCardAccountIds,
    previousItems,
    existingSourceIds,
    existingCardBillAccountIds,
  } = input

  const items: PlannedItem[] = []

  for (const r of recurringExpenses) {
    if (existingSourceIds.has(r.id)) continue
    items.push({
      name: r.name,
      amount: inheritedAmount(previousItems, r.id, r.defaultAmount),
      accountId: r.accountId,
      category: 'expense',
      paymentMethod: r.paymentMethod,
      sourceType: 'recurring',
      sourceId: r.id,
    })
  }

  for (const i of installments) {
    if (existingSourceIds.has(i.id)) continue
    if (!isInstallmentActive(i.startMonth, i.tenorMonths, targetMonth)) continue
    items.push({
      name: i.name,
      amount: i.monthlyAmount, // never inherited
      accountId: i.accountId,
      category: 'installment',
      paymentMethod: i.paymentMethod,
      sourceType: 'installment',
      sourceId: i.id,
    })
  }

  for (const s of savingsGoals) {
    if (existingSourceIds.has(s.id)) continue
    items.push({
      name: s.name,
      amount: inheritedAmount(previousItems, s.id, s.monthlyAmount),
      accountId: s.accountId,
      category: 'saving',
      paymentMethod: 'debit',
      sourceType: 'saving',
      sourceId: s.id,
    })
  }

  for (const accountId of creditCardAccountIds) {
    if (existingCardBillAccountIds.has(accountId)) continue
    items.push({
      name: 'Tagihan Kartu Kredit',
      amount: 0, // always starts at zero
      accountId,
      category: 'card_bill',
      paymentMethod: 'credit',
      sourceType: null,
      sourceId: null,
    })
  }

  return items
}
