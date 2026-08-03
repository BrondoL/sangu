'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { InlineRupiah } from './inline-rupiah'
import {
  setActualSalaryAction,
  setBalanceAction,
  setNoteAction,
} from '@/app/(app)/current/actions'
import type { Tables } from '@/lib/database.types'

export function TopPanel({
  periodId,
  actualSalary,
  note,
  accounts,
  balances,
}: {
  periodId: string
  actualSalary: number | null
  note: string | null
  accounts: Tables<'accounts'>[]
  balances: Tables<'monthly_balances'>[]
}) {
  const [noteValue, setNoteValue] = useState(note ?? '')
  const [pending, startTransition] = useTransition()

  const balanceOf = (accountId: string) =>
    balances.find((b) => b.account_id === accountId)?.balance ?? 0

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Gaji &amp; saldo</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1">
          <Label>Gaji aktual bulan ini</Label>
          <InlineRupiah
            label="Gaji aktual"
            value={actualSalary ?? 0}
            save={(amount) => setActualSalaryAction(periodId, amount)}
          />
        </div>

        <div className="space-y-2">
          <Label>Saldo awal tiap rekening</Label>
          {accounts.map((account) => (
            <div key={account.id} className="flex items-center gap-3">
              <span className="flex-1 text-sm">{account.name}</span>
              <InlineRupiah
                label={`Saldo ${account.name}`}
                value={balanceOf(account.id)}
                save={(amount) => setBalanceAction(periodId, account.id, amount)}
                className="w-40"
              />
            </div>
          ))}
        </div>

        <div className="space-y-1">
          <Label htmlFor="note">Catatan</Label>
          <Textarea
            id="note"
            rows={2}
            disabled={pending}
            value={noteValue}
            onChange={(e) => setNoteValue(e.target.value)}
            onBlur={() => {
              if (noteValue === (note ?? '')) return
              startTransition(async () => {
                const result = await setNoteAction(periodId, noteValue)
                if (result && !result.ok) {
                  toast.error(result.message)
                  setNoteValue(note ?? '')
                }
              })
            }}
          />
        </div>
      </CardContent>
    </Card>
  )
}
