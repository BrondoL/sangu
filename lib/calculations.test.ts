import { describe, it, expect } from 'vitest'
import { calculateMonthlySummary } from './calculations'
import type { MonthlyCalcInput } from './types'

const accounts = [
  { id: 'bca', name: 'BCA', isSalaryReceiver: true, isProxy: false },
  { id: 'jago', name: 'Jago', isSalaryReceiver: false, isProxy: true },
  { id: 'mandiri', name: 'Mandiri', isSalaryReceiver: false, isProxy: false },
  { id: 'bri', name: 'BRI', isSalaryReceiver: false, isProxy: false },
]

// Mirrors the worked example in the spec.
const base: MonthlyCalcInput = {
  accounts,
  baseSalary: 20_000_000,
  actualSalary: 22_000_000,
  balances: [
    { accountId: 'bca', balance: 500_000 },
    { accountId: 'jago', balance: 0 },
    { accountId: 'mandiri', balance: 1_000_000 },
    { accountId: 'bri', balance: 1_500_000 },
  ],
  items: [
    { accountId: 'bca', amount: 2_000_000, category: 'expense', isPaid: false },
    { accountId: 'jago', amount: 3_000_000, category: 'saving', isPaid: false },
    { accountId: 'mandiri', amount: 2_000_000, category: 'expense', isPaid: true },
    { accountId: 'mandiri', amount: 3_000_000, category: 'card_bill', isPaid: false },
    { accountId: 'bri', amount: 1_000_000, category: 'expense', isPaid: false },
  ],
}

describe('calculateMonthlySummary — normal month (spec example)', () => {
  const s = calculateMonthlySummary(base)
  it('totals all items regardless of category', () => {
    expect(s.totalExpense).toBe(11_000_000)
  })
  it('merges debit + credit of same account into one need', () => {
    const mandiri = s.perAccount.find((a) => a.accountId === 'mandiri')!
    expect(mandiri.need).toBe(5_000_000) // 2M expense + 3M card_bill
  })
  it('clamps shortfall at zero when balance exceeds need', () => {
    const bri = s.perAccount.find((a) => a.accountId === 'bri')!
    expect(bri.shortfall).toBe(0) // need 1M, balance 1.5M
  })
  it('sums total shortfall', () => {
    expect(s.totalShortfall).toBe(8_500_000)
  })
  it('computes sufficiency vs base and actual', () => {
    expect(s.sufficiencyVsBase).toBe(11_500_000)
    expect(s.sufficiencyVsActual).toBe(13_500_000)
  })
  it('computes transfer to proxy = non-receiver shortfalls + free money', () => {
    expect(s.transferToProxy).toBe(20_500_000) // (3M+4M+0) + 13.5M
  })
  it('sums unpaid only', () => {
    expect(s.unpaidTotal).toBe(9_000_000) // 11M - 2M paid
  })
})

describe('calculateMonthlySummary — deficit month', () => {
  it('reports negative sufficiency', () => {
    const s = calculateMonthlySummary({ ...base, actualSalary: 5_000_000 })
    expect(s.sufficiencyVsActual).toBe(-3_500_000)
  })
})

describe('calculateMonthlySummary — edge cases', () => {
  it('treats missing balance as zero', () => {
    const s = calculateMonthlySummary({ ...base, balances: [] })
    const bca = s.perAccount.find((a) => a.accountId === 'bca')!
    expect(bca.shortfall).toBe(2_000_000)
  })
  it('handles no items', () => {
    const s = calculateMonthlySummary({ ...base, items: [], balances: [] })
    expect(s.totalExpense).toBe(0)
    expect(s.transferToProxy).toBe(22_000_000) // free money only = full actual salary
  })
  it('null actualSalary hides actual sufficiency and transfer', () => {
    const s = calculateMonthlySummary({ ...base, actualSalary: null })
    expect(s.sufficiencyVsActual).toBeNull()
    expect(s.transferToProxy).toBeNull()
    expect(s.sufficiencyVsBase).toBe(11_500_000)
  })
  it('warns when no proxy account', () => {
    const noProxy = accounts.map((a) => ({ ...a, isProxy: false }))
    const s = calculateMonthlySummary({ ...base, accounts: noProxy })
    expect(s.warnings).toContain('no_proxy')
    expect(s.transferToProxy).toBeNull()
  })
  it('warns when no salary receiver', () => {
    const noRecv = accounts.map((a) => ({ ...a, isSalaryReceiver: false }))
    const s = calculateMonthlySummary({ ...base, accounts: noRecv })
    expect(s.warnings).toContain('no_salary_receiver')
  })
})
