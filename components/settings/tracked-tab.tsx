'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { formatRupiah } from '@/lib/format'
import type { ActionState } from '@/lib/types'

type Row = {
  id: string
  name: string
  default_amount: number
  is_active: boolean
  tracked: boolean
}

export function TrackedTab({
  rows,
  action,
}: {
  rows: Row[]
  action: (id: string, tracked: boolean) => Promise<ActionState>
}) {
  const [pending, startTransition] = useTransition()

  return (
    <Card>
      <CardContent className="space-y-4">
        <p className="text-muted-foreground text-xs">
          Pos yang dicentang muncul di halaman Belanja untuk dicatat harian.
          Tagihan tetap seperti kontrakan dan listrik tidak perlu dicentang —
          nominalnya sudah pasti, mencatatnya per transaksi tidak menambah
          informasi apa pun.
        </p>

        <ul className="divide-border divide-y">
          {rows
            .filter((r) => r.is_active)
            .map((r) => (
              <li key={r.id} className="flex items-center gap-3 py-2.5">
                <Checkbox
                  id={`tracked-${r.id}`}
                  checked={r.tracked}
                  disabled={pending}
                  onCheckedChange={(next) =>
                    startTransition(async () => {
                      const result = await action(r.id, next === true)
                      if (result && !result.ok) toast.error(result.message)
                    })
                  }
                />
                <Label htmlFor={`tracked-${r.id}`} className="flex-1 font-normal">
                  {r.name}
                </Label>
                <span className="amount text-muted-foreground text-sm">
                  {formatRupiah(r.default_amount)}
                </span>
              </li>
            ))}
        </ul>
      </CardContent>
    </Card>
  )
}
