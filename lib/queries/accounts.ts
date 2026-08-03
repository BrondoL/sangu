'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

type AccountInput = {
  id?: string
  name: string
  is_salary_receiver: boolean
  is_proxy: boolean
  has_credit_card: boolean
  is_active: boolean
  sort_order: number
}

export async function listAccounts() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .order('sort_order')
  if (error) throw error
  return data
}

export async function upsertAccount(input: AccountInput) {
  const supabase = await createClient()
  const { error } = await supabase.from('accounts').upsert(input)
  if (error) throw error
  revalidatePath('/settings')
  revalidatePath('/current')
  revalidatePath('/dashboard')
}

export async function deleteAccount(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('accounts').delete().eq('id', id)
  if (error) throw error
  revalidatePath('/settings')
  revalidatePath('/current')
  revalidatePath('/dashboard')
}
