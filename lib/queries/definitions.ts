'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { PaymentMethod } from '@/lib/types'

function revalidateAll() {
  revalidatePath('/settings')
  revalidatePath('/current')
  revalidatePath('/dashboard')
  revalidatePath('/goals')
}

// --- Recurring expenses ---

type RecurringInput = {
  id?: string
  name: string
  default_amount: number
  account_id: string
  payment_method: PaymentMethod
  is_active: boolean
}

export async function listRecurring() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('recurring_expenses')
    .select('*')
    .order('name')
  if (error) throw error
  return data
}

export async function upsertRecurring(input: RecurringInput) {
  const supabase = await createClient()
  const { error } = await supabase.from('recurring_expenses').upsert(input)
  if (error) throw error
  revalidateAll()
}

export async function deleteRecurring(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('recurring_expenses').delete().eq('id', id)
  if (error) throw error
  revalidateAll()
}

// --- Installments ---

type InstallmentInput = {
  id?: string
  name: string
  monthly_amount: number
  tenor_months: number
  start_month: string // 'YYYY-MM-01'
  account_id: string
  payment_method: PaymentMethod
}

export async function listInstallments() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('installments')
    .select('*')
    .order('start_month')
  if (error) throw error
  return data
}

export async function upsertInstallment(input: InstallmentInput) {
  const supabase = await createClient()
  const { error } = await supabase.from('installments').upsert(input)
  if (error) throw error
  revalidateAll()
}

export async function deleteInstallment(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('installments').delete().eq('id', id)
  if (error) throw error
  revalidateAll()
}

// --- Savings goals ---

type SavingsGoalInput = {
  id?: string
  name: string
  target_amount: number | null
  monthly_amount: number
  account_id: string
  target_date: string | null // 'YYYY-MM-DD'
  is_active: boolean
}

export async function listSavingsGoals() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('savings_goals')
    .select('*')
    .order('name')
  if (error) throw error
  return data
}

export async function upsertSavingsGoal(input: SavingsGoalInput) {
  const supabase = await createClient()
  const { error } = await supabase.from('savings_goals').upsert(input)
  if (error) throw error
  revalidateAll()
}

export async function deleteSavingsGoal(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('savings_goals').delete().eq('id', id)
  if (error) throw error
  revalidateAll()
}

// --- Settings ---

export async function getSettings() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('settings')
    .select('*')
    .maybeSingle()
  if (error) throw error
  return data ?? { base_salary: 0, user_id: '' }
}

export async function setBaseSalary(baseSalary: number) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Tidak ada sesi aktif')

  const { error } = await supabase
    .from('settings')
    .upsert({ user_id: user.id, base_salary: baseSalary }, { onConflict: 'user_id' })
  if (error) throw error
  revalidateAll()
}
