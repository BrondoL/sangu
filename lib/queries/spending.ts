'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  toIsoMonth,
  toMonthParam,
  shiftMonth,
  currentMonthParam,
} from '@/lib/month'

function revalidateSpending() {
  revalidatePath('/spending')
  revalidatePath('/spending/riwayat')
}

/** The budgets followed here, with the amount their definition carries now. */
export async function listTrackedBudgets() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('tracked_budgets')
    .select('sort_order, recurring_expenses(id, name, default_amount, is_active)')
    .order('sort_order')
  if (error) throw error

  return (data ?? [])
    .filter((r) => r.recurring_expenses !== null)
    .map((r) => ({
      id: r.recurring_expenses!.id,
      name: r.recurring_expenses!.name,
      amount: r.recurring_expenses!.default_amount,
      isActive: r.recurring_expenses!.is_active,
    }))
}

/** Every active recurring expense, flagged with whether it is tracked. */
export async function listAllRecurringWithTracking() {
  const supabase = await createClient()
  const [{ data: recurring, error: rErr }, { data: tracked, error: tErr }] =
    await Promise.all([
      supabase
        .from('recurring_expenses')
        .select('id, name, default_amount, is_active')
        .order('name'),
      supabase.from('tracked_budgets').select('recurring_expense_id'),
    ])
  const error = rErr ?? tErr
  if (error) throw error

  const on = new Set((tracked ?? []).map((t) => t.recurring_expense_id))
  return (recurring ?? []).map((r) => ({ ...r, tracked: on.has(r.id) }))
}

/**
 * Photograph each tracked budget's amount for this month, once. Written on
 * first sight rather than on a schedule, because there is no scheduler — and
 * without it, raising a budget later rewrites the history that justified it.
 */
export async function ensureBudgetSnapshots(month: string) {
  const supabase = await createClient()
  const iso = toIsoMonth(month)

  const [allTracked, { data: existing, error }] = await Promise.all([
    listTrackedBudgets(),
    supabase.from('budget_months').select('recurring_expense_id').eq('month', iso),
  ])
  if (error) throw error

  // A retired budget is not running, so it has no amount that applies to this
  // month. Snapshotting it anyway would add a fresh zero-spend month every
  // month forever, and those months are exactly what suggestAdjustment reads.
  const budgets = allTracked.filter((b) => b.isActive)

  const have = new Set((existing ?? []).map((e) => e.recurring_expense_id))
  const missing = budgets.filter((b) => !have.has(b.id))
  if (missing.length === 0) return

  // ignoreDuplicates: two tabs opening the same month must not race into a
  // primary-key violation.
  const { error: insErr } = await supabase.from('budget_months').upsert(
    missing.map((b) => ({
      recurring_expense_id: b.id,
      month: iso,
      amount: b.amount,
    })),
    { onConflict: 'user_id,recurring_expense_id,month', ignoreDuplicates: true }
  )
  if (insErr) throw insErr
}

/** The month's rows, bounded by an exclusive upper edge so no day is counted twice. */
export async function getSpendingForMonth(month: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('spending')
    .select('*')
    .gte('occurred_on', toIsoMonth(month))
    .lt('occurred_on', toIsoMonth(shiftMonth(month, 1)))
    // Several entries a day is the normal case here, and `occurred_on` alone
    // leaves those ties in whatever order Postgres happens to return, so the
    // list reshuffles between renders. created_at breaks the tie the way the
    // user experienced it: newest entry of the day on top.
    .order('occurred_on', { ascending: false })
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function listNotes() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('spending')
    .select('note')
    .not('note', 'is', null)
    .order('created_at', { ascending: false })
    .limit(200)
  if (error) throw error

  const seen = new Set<string>()
  const notes: string[] = []
  for (const r of data ?? []) {
    const label = (r.note ?? '').trim()
    if (label === '' || seen.has(label.toLowerCase())) continue
    seen.add(label.toLowerCase())
    notes.push(label)
  }
  return notes
}

export async function addSpending(input: {
  occurred_on: string
  amount: number
  recurring_expense_id: string | null
  note: string | null
}) {
  const supabase = await createClient()
  const { error } = await supabase.from('spending').insert(input)
  if (error) throw error
  revalidateSpending()
}

export async function deleteSpending(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('spending').delete().eq('id', id)
  if (error) throw error
  revalidateSpending()
}

export async function setTracked(recurringExpenseId: string, tracked: boolean) {
  const supabase = await createClient()
  if (tracked) {
    const { error } = await supabase
      .from('tracked_budgets')
      .upsert(
        { recurring_expense_id: recurringExpenseId },
        { onConflict: 'user_id,recurring_expense_id', ignoreDuplicates: true }
      )
    if (error) throw error
  } else {
    const { error } = await supabase
      .from('tracked_budgets')
      .delete()
      .eq('recurring_expense_id', recurringExpenseId)
    if (error) throw error
  }
  revalidatePath('/settings')
  revalidateSpending()
}

/**
 * The one write this feature makes into the planner's data. Guarded by a
 * confirmation dialog in the UI — nothing changes a budget on one tap.
 *
 * The dialog is not the guard, though. This file carries a top-level
 * 'use server', so every export here is an endpoint any page that ever
 * rendered can still call: a tab opened before a budget was untracked or
 * deactivated still holds a live reference to this action, and would write
 * through it. So the conditions the UI checks before showing the button are
 * checked again here, where they cannot be skipped.
 */
export async function setBudgetAmount(recurringExpenseId: string, amount: number) {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error('Nominal budget harus bilangan bulat lebih dari nol.')
  }

  const tracked = await listTrackedBudgets()
  const target = tracked.find((b) => b.id === recurringExpenseId)
  if (!target) {
    throw new Error(
      'Pos ini sudah tidak dilacak, jadi budgetnya tidak bisa diubah dari sini.'
    )
  }
  if (!target.isActive) {
    throw new Error('Pos ini sudah non-aktif, jadi budgetnya tidak bisa diubah.')
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('recurring_expenses')
    .update({ default_amount: amount })
    .eq('id', recurringExpenseId)
  if (error) throw error

  // The current month's snapshot follows the definition, and nothing else does.
  // This month is still being lived, so the budget that applies to it is the
  // one just chosen; leaving the snapshot behind makes Belanja show the old
  // figure and leaves Riwayat comparing the new suggestion against the number
  // it was meant to replace, so the same row keeps offering the change that was
  // already accepted. Past months are history: they record what the budget
  // actually was then, and moving them would destroy the evidence the change
  // was made on. Upsert, because the month may have no row yet.
  const { error: snapErr } = await supabase.from('budget_months').upsert(
    {
      recurring_expense_id: recurringExpenseId,
      month: toIsoMonth(currentMonthParam()),
      amount,
    },
    { onConflict: 'user_id,recurring_expense_id,month' }
  )
  if (snapErr) throw snapErr

  revalidatePath('/settings')
  revalidatePath('/current')
  revalidateSpending()
}

/**
 * The tracked budgets as they stood in `month`, read from the snapshot rather
 * than from the definition. The page has a month picker: without this, opening
 * August in October would hold August's spending against October's budget,
 * which is the exact drift budget_months exists to prevent.
 *
 * `amount` is null when the month has no snapshot. Only the current month is
 * ever snapshotted, so any past month the picker reaches may be a gap — the
 * same gap Riwayat already draws. For the current month `ensureBudgetSnapshots`
 * runs before this read, so an active tracked budget always has an amount.
 */
export async function listBudgetsForMonth(month: string) {
  const supabase = await createClient()
  const [allTracked, { data: snaps, error }] = await Promise.all([
    listTrackedBudgets(),
    supabase
      .from('budget_months')
      .select('recurring_expense_id, amount')
      .eq('month', toIsoMonth(month)),
  ])
  if (error) throw error

  // Belanja shows budgets you are still running, not ones you have retired.
  const tracked = allTracked.filter((b) => b.isActive)

  const snapshot = new Map(
    (snaps ?? []).map((s) => [s.recurring_expense_id, s.amount])
  )
  // A month with no snapshot is a gap, and it stays one. Falling back to the
  // definition's amount here would grade June's spending against August's
  // budget and print a red "Lebih" against a figure that never applied to June
  // — while Riwayat, reading the same absent row, calls that month "belum
  // tercatat". One of the two would have to be lying; this is the one that was.
  return tracked.map((b) => ({
    ...b,
    amount: snapshot.get(b.id) ?? null,
  }))
}

/** Snapshots and spending for a window of months, shaped for `lib/budget.ts`. */
export async function getSpendingHistory(months: string[]) {
  const supabase = await createClient()
  const from = toIsoMonth(months[0])
  const toExclusive = toIsoMonth(shiftMonth(months[months.length - 1], 1))

  const [{ data: snaps, error: sErr }, { data: spend, error: pErr }] =
    await Promise.all([
      supabase
        .from('budget_months')
        .select('recurring_expense_id, month, amount')
        .gte('month', from)
        .lt('month', toExclusive),
      supabase
        .from('spending')
        .select('recurring_expense_id, occurred_on, amount, note')
        .gte('occurred_on', from)
        .lt('occurred_on', toExclusive),
    ])
  const error = sErr ?? pErr
  if (error) throw error

  return {
    snapshots: (snaps ?? []).map((s) => ({
      recurringExpenseId: s.recurring_expense_id,
      month: toMonthParam(s.month),
      amount: s.amount,
    })),
    spending: (spend ?? []).map((s) => ({
      recurringExpenseId: s.recurring_expense_id,
      month: toMonthParam(s.occurred_on),
      amount: s.amount,
      note: s.note,
    })),
  }
}
