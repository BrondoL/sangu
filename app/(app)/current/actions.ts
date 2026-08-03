'use server'

import {
  updateItemAmount,
  toggleItemPaid,
  addManualItem,
  deleteItem,
  setActualSalary,
  setBalance,
  setNote,
  generateMonth,
} from '@/lib/queries/periods'
import type { ActionState, Category, PaymentMethod } from '@/lib/types'

function fail(e: unknown): ActionState {
  return {
    ok: false,
    message: e instanceof Error ? e.message : 'Terjadi kesalahan',
  }
}

export async function generateMonthAction(month: string): Promise<ActionState> {
  try {
    await generateMonth(month)
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}

export async function updateItemAmountAction(
  id: string,
  amount: number
): Promise<ActionState> {
  try {
    await updateItemAmount(id, amount)
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}

export async function toggleItemPaidAction(
  id: string,
  isPaid: boolean
): Promise<ActionState> {
  try {
    await toggleItemPaid(id, isPaid)
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}

export async function deleteItemAction(id: string): Promise<ActionState> {
  try {
    await deleteItem(id)
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}

export async function addItemAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    await addManualItem({
      period_id: String(formData.get('period_id')),
      name: String(formData.get('name')),
      amount: Number(formData.get('amount') ?? 0),
      account_id: String(formData.get('account_id')),
      category: String(formData.get('category')) as Category,
      payment_method: String(formData.get('payment_method')) as PaymentMethod,
    })
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}

export async function setActualSalaryAction(
  periodId: string,
  amount: number
): Promise<ActionState> {
  try {
    await setActualSalary(periodId, amount)
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}

export async function setBalanceAction(
  periodId: string,
  accountId: string,
  amount: number
): Promise<ActionState> {
  try {
    await setBalance(periodId, accountId, amount)
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}

export async function setNoteAction(
  periodId: string,
  note: string
): Promise<ActionState> {
  try {
    await setNote(periodId, note)
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}
