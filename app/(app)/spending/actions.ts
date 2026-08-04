'use server'

import {
  addSpending,
  updateSpending,
  deleteSpending,
  setBudgetAmount,
} from '@/lib/queries/spending'
import type { ActionState } from '@/lib/types'
import { toRecurringExpenseId } from '@/lib/pos'

const str = (fd: FormData, key: string) => String(fd.get(key) ?? '')
const num = (fd: FormData, key: string) => Number(fd.get(key) ?? 0)

function message(e: unknown): string {
  return e instanceof Error ? e.message : 'Terjadi kesalahan'
}

export async function addSpendingAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const amount = num(formData, 'amount')
  if (amount <= 0) return { ok: false, message: 'Nominal harus lebih dari nol' }

  const budget = str(formData, 'recurring_expense_id')
  const note = str(formData, 'note').trim()

  try {
    await addSpending({
      occurred_on: str(formData, 'occurred_on'),
      amount,
      recurring_expense_id: toRecurringExpenseId(budget),
      note: note === '' ? null : note,
    })
    return { ok: true }
  } catch (e) {
    return { ok: false, message: message(e) }
  }
}

/**
 * The correction path for a row already recorded. Reads the same four fields as
 * `addSpendingAction` and guards them the same way — a mistyped 250.000 is the
 * thing this exists to fix, so it must not be able to write a new mistake the
 * capture form would have refused.
 */
export async function updateSpendingAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const amount = num(formData, 'amount')
  if (amount <= 0) return { ok: false, message: 'Nominal harus lebih dari nol' }

  const id = str(formData, 'id')
  if (id === '') return { ok: false, message: 'Catatan tidak ditemukan' }

  const budget = str(formData, 'recurring_expense_id')
  const note = str(formData, 'note').trim()

  try {
    await updateSpending(id, {
      occurred_on: str(formData, 'occurred_on'),
      amount,
      recurring_expense_id: toRecurringExpenseId(budget),
      note: note === '' ? null : note,
    })
    return { ok: true }
  } catch (e) {
    return { ok: false, message: message(e) }
  }
}

export async function deleteSpendingAction(id: string): Promise<ActionState> {
  try {
    await deleteSpending(id)
    return { ok: true }
  } catch (e) {
    return { ok: false, message: message(e) }
  }
}

export async function applyAdjustmentAction(
  recurringExpenseId: string,
  amount: number
): Promise<ActionState> {
  if (amount <= 0) return { ok: false, message: 'Nominal harus lebih dari nol' }
  try {
    await setBudgetAmount(recurringExpenseId, amount)
    return { ok: true }
  } catch (e) {
    return { ok: false, message: message(e) }
  }
}
