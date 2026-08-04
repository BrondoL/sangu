'use server'

import { createClient } from '@/lib/supabase/server'
import { shiftMonth, toIsoMonth } from '@/lib/month'
import type { MonthlyCalcInput } from '@/lib/types'
import type { Tables } from '@/lib/database.types'

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
 *
 * The account rows come back alongside the calc input because the page renders
 * them too. They are already in hand here, and calling `listAccounts` for them
 * would ask the same table for the same rows a second time.
 */
export async function getMonthlyData(
  month: string
): Promise<{ input: MonthlyCalcInput; accounts: Tables<'accounts'>[] }> {
  const supabase = await createClient()
  const iso = toIsoMonth(month)

  // Items and balances are embedded through their period_id foreign key rather
  // than fetched in a second wave keyed on period.id. Same rows, one round trip
  // instead of two — which is the whole month's latency budget on a cold hit.
  const [
    { data: accounts, error: aErr },
    { data: period, error: pErr },
    { data: settings, error: sErr },
  ] = await Promise.all([
    // Deliberately unfiltered: an account deactivated today may still carry
    // items in an old month, and that month has to keep showing them.
    supabase.from('accounts').select('*').order('sort_order'),
    supabase
      .from('monthly_periods')
      .select(
        'actual_salary, monthly_items(account_id, amount, category, is_paid), monthly_balances(account_id, balance)'
      )
      .eq('month', iso)
      .maybeSingle(),
    supabase.from('settings').select('base_salary').maybeSingle(),
  ])
  const error = aErr ?? pErr ?? sErr
  if (error) throw error

  const toCalcAccount = (a: {
    id: string
    name: string
    is_salary_receiver: boolean
    is_proxy: boolean
  }) => ({
    id: a.id,
    name: a.name,
    isSalaryReceiver: a.is_salary_receiver,
    isProxy: a.is_proxy,
  })

  const all = accounts ?? []
  const baseSalary = settings?.base_salary ?? 0

  if (!period) {
    return {
      accounts: all,
      input: {
        accounts: all.filter((a) => a.is_active).map(toCalcAccount),
        items: [],
        balances: [],
        actualSalary: null,
        baseSalary,
      },
    }
  }

  const { monthly_items: items, monthly_balances: balances } = period

  // A deactivated account earns its row back only for the months it took part
  // in — otherwise every retired account would linger as an empty row forever.
  const involved = new Set([
    ...items.map((i) => i.account_id),
    ...balances.map((b) => b.account_id),
  ])

  return {
    accounts: all,
    input: {
      accounts: all
        .filter((a) => a.is_active || involved.has(a.id))
        .map(toCalcAccount),
      items: items.map((i) => ({
        accountId: i.account_id,
        amount: i.amount,
        category: i.category,
        isPaid: i.is_paid,
      })),
      balances: balances.map((b) => ({
        accountId: b.account_id,
        balance: b.balance,
      })),
      actualSalary: period.actual_salary,
      baseSalary,
    },
  }
}
