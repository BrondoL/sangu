'use server'

import { upsertAccount, deleteAccount } from '@/lib/queries/accounts'
import {
  upsertRecurring,
  deleteRecurring,
  upsertInstallment,
  deleteInstallment,
  upsertSavingsGoal,
  deleteSavingsGoal,
  setBaseSalary,
} from '@/lib/queries/definitions'
import type { ActionState, PaymentMethod } from '@/lib/types'

/** Postgres error codes we can explain better than the driver does. */
function messageFor(e: unknown, context: 'account' | 'generic'): string {
  const code = (e as { code?: string })?.code
  if (code === '23505' && context === 'account') {
    return 'Sudah ada rekening penerima gaji/proxy lain'
  }
  if (code === '23503') {
    return 'Masih dipakai data lain, tidak bisa dihapus'
  }
  return e instanceof Error ? e.message : 'Terjadi kesalahan'
}

const str = (fd: FormData, key: string) => String(fd.get(key) ?? '')
const num = (fd: FormData, key: string) => Number(fd.get(key) ?? 0)
const bool = (fd: FormData, key: string) => fd.get(key) === 'on'
const optId = (fd: FormData, key: string) => {
  const v = str(fd, key)
  return v === '' ? undefined : v
}

// --- Accounts ---

export async function saveAccountAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    await upsertAccount({
      id: optId(formData, 'id'),
      name: str(formData, 'name'),
      is_salary_receiver: bool(formData, 'is_salary_receiver'),
      is_proxy: bool(formData, 'is_proxy'),
      has_credit_card: bool(formData, 'has_credit_card'),
      is_active: bool(formData, 'is_active'),
      sort_order: num(formData, 'sort_order'),
    })
    return { ok: true }
  } catch (e) {
    return { ok: false, message: messageFor(e, 'account') }
  }
}

export async function deleteAccountAction(id: string): Promise<ActionState> {
  try {
    await deleteAccount(id)
    return { ok: true }
  } catch (e) {
    return { ok: false, message: messageFor(e, 'generic') }
  }
}

// --- Recurring expenses ---

export async function saveRecurringAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    await upsertRecurring({
      id: optId(formData, 'id'),
      name: str(formData, 'name'),
      default_amount: num(formData, 'default_amount'),
      account_id: str(formData, 'account_id'),
      payment_method: str(formData, 'payment_method') as PaymentMethod,
      is_active: bool(formData, 'is_active'),
    })
    return { ok: true }
  } catch (e) {
    return { ok: false, message: messageFor(e, 'generic') }
  }
}

export async function deleteRecurringAction(id: string): Promise<ActionState> {
  try {
    await deleteRecurring(id)
    return { ok: true }
  } catch (e) {
    return { ok: false, message: messageFor(e, 'generic') }
  }
}

// --- Installments ---

export async function saveInstallmentAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    await upsertInstallment({
      id: optId(formData, 'id'),
      name: str(formData, 'name'),
      monthly_amount: num(formData, 'monthly_amount'),
      tenor_months: num(formData, 'tenor_months'),
      // <input type="month"> yields 'YYYY-MM'; the column is a date.
      start_month: `${str(formData, 'start_month')}-01`,
      account_id: str(formData, 'account_id'),
      payment_method: str(formData, 'payment_method') as PaymentMethod,
    })
    return { ok: true }
  } catch (e) {
    return { ok: false, message: messageFor(e, 'generic') }
  }
}

export async function deleteInstallmentAction(id: string): Promise<ActionState> {
  try {
    await deleteInstallment(id)
    return { ok: true }
  } catch (e) {
    return { ok: false, message: messageFor(e, 'generic') }
  }
}

// --- Savings goals ---

export async function saveSavingsGoalAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    const targetAmount = num(formData, 'target_amount')
    const targetDate = str(formData, 'target_date')
    await upsertSavingsGoal({
      id: optId(formData, 'id'),
      name: str(formData, 'name'),
      target_amount: targetAmount > 0 ? targetAmount : null,
      monthly_amount: num(formData, 'monthly_amount'),
      account_id: str(formData, 'account_id'),
      target_date: targetDate === '' ? null : targetDate,
      is_active: bool(formData, 'is_active'),
    })
    return { ok: true }
  } catch (e) {
    return { ok: false, message: messageFor(e, 'generic') }
  }
}

export async function deleteSavingsGoalAction(id: string): Promise<ActionState> {
  try {
    await deleteSavingsGoal(id)
    return { ok: true }
  } catch (e) {
    return { ok: false, message: messageFor(e, 'generic') }
  }
}

// --- Base salary ---

export async function saveBaseSalaryAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    await setBaseSalary(num(formData, 'base_salary'))
    return { ok: true }
  } catch (e) {
    return { ok: false, message: messageFor(e, 'generic') }
  }
}
