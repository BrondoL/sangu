'use server'

import { createClient } from '@/lib/supabase/server'

export async function getGoalProgress() {
  const supabase = await createClient()

  const [{ data: goals, error: gErr }, { data: paidSavings, error: sErr }] =
    await Promise.all([
      supabase.from('savings_goals').select('*').eq('is_active', true).order('name'),
      // Accumulated = sum of paid saving items whose source_id = goal id,
      // across all periods.
      supabase
        .from('monthly_items')
        .select('source_id, amount')
        .eq('category', 'saving')
        .eq('is_paid', true),
    ])
  const err = gErr ?? sErr
  if (err) throw err

  return (goals ?? []).map((g) => {
    const accumulated = (paidSavings ?? [])
      .filter((i) => i.source_id === g.id)
      .reduce((s, i) => s + i.amount, 0)
    return { goal: g, accumulated }
  })
}
