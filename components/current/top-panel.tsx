'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { SectionHead } from '@/components/kwitansi'
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
      <CardContent className="space-y-5">
        {/* The two figures you fill in before anything else each month. */}
        <div>
          <SectionHead title="Gaji aktual bulan ini" />
          <InlineRupiah
            label="Gaji aktual"
            value={actualSalary ?? 0}
            save={(amount) => setActualSalaryAction(periodId, amount)}
            className="w-full text-lg"
          />
        </div>

        <div>
          <SectionHead title="Saldo awal tiap rekening" />
          <div className="divide-border/60 -my-1 divide-y">
            {accounts.map((account) => (
              <div key={account.id} className="flex items-center gap-3 py-2">
                <span className="flex-1 truncate text-sm">{account.name}</span>
                <InlineRupiah
                  label={`Saldo ${account.name}`}
                  value={balanceOf(account.id)}
                  save={(amount) => setBalanceAction(periodId, account.id, amount)}
                  className="w-32 shrink-0 sm:w-40"
                />
              </div>
            ))}
          </div>
        </div>

        <div>
          <Label htmlFor="note" className="sr-only">
            Catatan
          </Label>
          <SectionHead title="Catatan" />
          <Textarea
            id="note"
            rows={2}
            placeholder="Kejadian tak biasa bulan ini"
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
