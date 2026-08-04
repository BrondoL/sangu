'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatRupiah } from '@/lib/format'
import type { ActionState } from '@/lib/types'

type Row = {
  id: string
  name: string
  default_amount: number
  is_active: boolean
  tracked: boolean
}

function TrackedRow({
  row,
  action,
}: {
  row: Row
  action: (id: string, tracked: boolean) => Promise<ActionState>
}) {
  // Its own transition, so one row in flight never disables its neighbours —
  // same reason components/current/item-row.tsx keeps state per row.
  const [pending, startTransition] = useTransition()

  return (
    <li className="flex items-center gap-3 py-2.5">
      <Checkbox
        id={`tracked-${row.id}`}
        checked={row.tracked}
        disabled={pending}
        onCheckedChange={(next) =>
          startTransition(async () => {
            const result = await action(row.id, next === true)
            if (result && !result.ok) toast.error(result.message)
          })
        }
      />
      <Label htmlFor={`tracked-${row.id}`} className="flex-1 font-normal">
        {row.name}
      </Label>
      {!row.is_active && (
        <Badge variant="secondary" className="font-normal">
          Non-aktif
        </Badge>
      )}
      <span className="amount text-muted-foreground text-sm">
        {formatRupiah(row.default_amount)}
      </span>
    </li>
  )
}

export function TrackedTab({
  rows,
  action,
}: {
  rows: Row[]
  action: (id: string, tracked: boolean) => Promise<ActionState>
}) {
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
            // An inactive budget still shows while it is tracked, otherwise it
            // would be counted by the tab but impossible to untick.
            .filter((r) => r.is_active || r.tracked)
            .map((r) => (
              <TrackedRow key={r.id} row={r} action={action} />
            ))}
        </ul>
      </CardContent>
    </Card>
  )
}
