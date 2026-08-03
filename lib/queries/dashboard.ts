'use server'

import { createClient } from '@/lib/supabase/server'
import { shiftMonth, toIsoMonth } from '@/lib/month'
import type { MonthlyCalcInput } from '@/lib/types'

/**
 * Total planned spend per month for the trailing window ending at `month`,
 * including months with no period (as zero) so the line has no gaps.
 */
export async function getExpenseTrend(
  month: string,
  months = 6
): Promise<{ month: string; total: number }[]> {
  const supabase = await createClient()
  const window = Array.from({ length: months }, (_, i) =>
    toIsoMonth(shiftMonth(month, i - (months - 1)))
  )

  const { data, error } = await supabase
    .from('monthly_periods')
    .select('month, monthly_items(amount)')
    .gte('month', window[0])
    .lte('month', window[window.length - 1])
  if (error) throw error

  const totals = new Map(
    (data ?? []).map((p) => [
      p.month,
      p.monthly_items.reduce((sum, i) => sum + i.amount, 0),
    ])
  )
  return window.map((m) => ({ month: m, total: totals.get(m) ?? 0 }))
}

/**
 * Loads everything `calculateMonthlySummary` needs for one month and maps the
 * DB's snake_case into the calc engine's camelCase. Deliberately does NOT run
 * the calculation — the page does that, so this stays a pure DB read.
 */
export async function getMonthlyData(month: string): Promise<MonthlyCalcInput> {
  const supabase = await createClient()
  const iso = toIsoMonth(month)

  const [
    { data: accounts, error: aErr },
    { data: period, error: pErr },
    { data: settings, error: sErr },
  ] = await Promise.all([
    supabase.from('accounts').select('*').eq('is_active', true).order('sort_order'),
    supabase.from('monthly_periods').select('*').eq('month', iso).maybeSingle(),
    supabase.from('settings').select('base_salary').maybeSingle(),
  ])
  const headErr = aErr ?? pErr ?? sErr
  if (headErr) throw headErr

  const calcAccounts = (accounts ?? []).map((a) => ({
    id: a.id,
    name: a.name,
    isSalaryReceiver: a.is_salary_receiver,
    isProxy: a.is_proxy,
  }))

  if (!period) {
    return {
      accounts: calcAccounts,
      items: [],
      balances: [],
      actualSalary: null,
      baseSalary: settings?.base_salary ?? 0,
    }
  }

  const [{ data: items, error: iErr }, { data: balances, error: bErr }] =
    await Promise.all([
      supabase
        .from('monthly_items')
        .select('account_id, amount, category, is_paid')
        .eq('period_id', period.id),
      supabase
        .from('monthly_balances')
        .select('account_id, balance')
        .eq('period_id', period.id),
    ])
  const bodyErr = iErr ?? bErr
  if (bodyErr) throw bodyErr

  return {
    accounts: calcAccounts,
    items: (items ?? []).map((i) => ({
      accountId: i.account_id,
      amount: i.amount,
      category: i.category,
      isPaid: i.is_paid,
    })),
    balances: (balances ?? []).map((b) => ({
      accountId: b.account_id,
      balance: b.balance,
    })),
    actualSalary: period.actual_salary,
    baseSalary: settings?.base_salary ?? 0,
  }
}
