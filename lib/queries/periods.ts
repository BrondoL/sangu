'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { planNewMonthItems } from '@/lib/generate'
import { shiftMonth, toIsoMonth } from '@/lib/month'
import type { Category, PaymentMethod, PreviousItem } from '@/lib/types'

function revalidateMonthViews() {
  revalidatePath('/current')
  revalidatePath('/dashboard')
  revalidatePath('/goals')
}

// --- Reads ---

export async function getPeriod(month: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('monthly_periods')
    .select('*')
    .eq('month', toIsoMonth(month))
    .maybeSingle()
  if (error) throw error
  return data
}

export async function getItems(periodId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('monthly_items')
    .select('*')
    .eq('period_id', periodId)
    .order('name')
  if (error) throw error
  return data
}

export async function getBalances(periodId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('monthly_balances')
    .select('*')
    .eq('period_id', periodId)
  if (error) throw error
  return data
}

// --- Item mutations (touch monthly_items only, never the definitions) ---

export async function updateItemAmount(id: string, amount: number) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('monthly_items')
    .update({ amount })
    .eq('id', id)
  if (error) throw error
  revalidateMonthViews()
}

export async function toggleItemPaid(id: string, isPaid: boolean) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('monthly_items')
    .update({ is_paid: isPaid })
    .eq('id', id)
  if (error) throw error
  revalidateMonthViews()
}

export async function addManualItem(input: {
  period_id: string
  name: string
  amount: number
  account_id: string
  category: Category
  payment_method: PaymentMethod
}) {
  const supabase = await createClient()
  const { error } = await supabase.from('monthly_items').insert(input)
  if (error) throw error
  revalidateMonthViews()
}

export async function deleteItem(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('monthly_items').delete().eq('id', id)
  if (error) throw error
  revalidateMonthViews()
}

// --- Period-level mutations ---

export async function setActualSalary(periodId: string, amount: number | null) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('monthly_periods')
    .update({ actual_salary: amount })
    .eq('id', periodId)
  if (error) throw error
  revalidateMonthViews()
}

export async function setNote(periodId: string, note: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('monthly_periods')
    .update({ note })
    .eq('id', periodId)
  if (error) throw error
  revalidateMonthViews()
}

export async function setBalance(
  periodId: string,
  accountId: string,
  balance: number
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Tidak ada sesi aktif')

  const { error } = await supabase.from('monthly_balances').upsert(
    {
      user_id: user.id,
      period_id: periodId,
      account_id: accountId,
      balance,
    },
    { onConflict: 'period_id,account_id' }
  )
  if (error) throw error
  revalidateMonthViews()
}

// --- Generation ---

/**
 * Creates the period if missing, then inserts the items the pure planner asks
 * for. Safe to call repeatedly: the planner skips anything already present.
 */
export async function generateMonth(month: string) {
  const supabase = await createClient()
  const iso = toIsoMonth(month)

  // 1. Ensure the period row exists.
  const { data: found, error: findErr } = await supabase
    .from('monthly_periods')
    .select('id, excluded_source_ids')
    .eq('month', iso)
    .maybeSingle()
  if (findErr) throw findErr

  let period = found
  if (!period) {
    const { data: created, error: createErr } = await supabase
      .from('monthly_periods')
      .insert({ month: iso })
      .select('id, excluded_source_ids')
      .single()
    if (createErr) throw createErr
    period = created
  }
  const periodId = period.id

  // 2. Load definitions.
  const [
    { data: recurring, error: rErr },
    { data: installments, error: iErr },
    { data: savings, error: sErr },
    { data: accounts, error: aErr },
  ] = await Promise.all([
    supabase.from('recurring_expenses').select('*').eq('is_active', true),
    supabase.from('installments').select('*'),
    supabase.from('savings_goals').select('*').eq('is_active', true),
    supabase.from('accounts').select('*').eq('is_active', true),
  ])
  const defErr = rErr ?? iErr ?? sErr ?? aErr
  if (defErr) throw defErr

  // 3. Existing items in this period (idempotency) + previous month (inheritance).
  const { data: existing, error: exErr } = await supabase
    .from('monthly_items')
    .select('source_id, category, account_id')
    .eq('period_id', periodId)
  if (exErr) throw exErr

  const { data: prevPeriod, error: ppErr } = await supabase
    .from('monthly_periods')
    .select('id')
    .eq('month', toIsoMonth(shiftMonth(iso, -1)))
    .maybeSingle()
  if (ppErr) throw ppErr

  let previousItems: PreviousItem[] | null = null
  if (prevPeriod) {
    const { data, error } = await supabase
      .from('monthly_items')
      .select('source_type, source_id, amount')
      .eq('period_id', prevPeriod.id)
    if (error) throw error
    previousItems = (data ?? []).map((r) => ({
      sourceType: r.source_type,
      sourceId: r.source_id,
      amount: r.amount,
    }))
  }

  const existingSourceIds = new Set(
    (existing ?? []).map((e) => e.source_id).filter((x): x is string => !!x)
  )
  const existingCardBillAccountIds = new Set(
    (existing ?? [])
      .filter((e) => e.category === 'card_bill')
      .map((e) => e.account_id)
  )

  // 4. Plan (pure) and insert.
  const planned = planNewMonthItems({
    targetMonth: iso,
    recurringExpenses: (recurring ?? []).map((r) => ({
      id: r.id,
      name: r.name,
      defaultAmount: r.default_amount,
      accountId: r.account_id,
      paymentMethod: r.payment_method,
    })),
    installments: (installments ?? []).map((i) => ({
      id: i.id,
      name: i.name,
      monthlyAmount: i.monthly_amount,
      tenorMonths: i.tenor_months,
      startMonth: i.start_month,
      accountId: i.account_id,
      paymentMethod: i.payment_method,
    })),
    savingsGoals: (savings ?? []).map((s) => ({
      id: s.id,
      name: s.name,
      monthlyAmount: s.monthly_amount,
      accountId: s.account_id,
    })),
    creditCardAccountIds: (accounts ?? [])
      .filter((a) => a.has_credit_card)
      .map((a) => a.id),
    previousItems,
    existingSourceIds,
    existingCardBillAccountIds,
    excludedSourceIds: new Set(period.excluded_source_ids),
  })

  if (planned.length > 0) {
    const rows = planned.map((p) => ({
      period_id: periodId,
      name: p.name,
      amount: p.amount,
      account_id: p.accountId,
      category: p.category,
      payment_method: p.paymentMethod,
      source_type: p.sourceType,
      source_id: p.sourceId,
    }))
    const { error } = await supabase.from('monthly_items').insert(rows)
    if (error) throw error
  }

  revalidateMonthViews()
  return periodId
}
