'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'
import { Checkbox } from '@/components/ui/checkbox'
import { InlineRupiah } from './inline-rupiah'
import { DeleteButton } from '@/components/delete-button'
import {
  updateItemAmountAction,
  toggleItemPaidAction,
  deleteItemAction,
} from '@/app/(app)/current/actions'
import type { Tables } from '@/lib/database.types'

export function ItemRow({
  item,
  accountName,
}: {
  item: Tables<'monthly_items'>
  accountName: string
}) {
  const [pending, startTransition] = useTransition()

  return (
    <div className="flex items-center gap-3 py-2">
      <Checkbox
        aria-label={`Tandai ${item.name} sudah dibayar`}
        checked={item.is_paid}
        disabled={pending}
        onCheckedChange={(checked) =>
          startTransition(async () => {
            const result = await toggleItemPaidAction(item.id, checked === true)
            if (result && !result.ok) toast.error(result.message)
          })
        }
      />

      <div className="min-w-0 flex-1">
        <p
          className={
            item.is_paid ? 'text-muted-foreground truncate line-through' : 'truncate'
          }
        >
          {item.name}
        </p>
        <p className="text-muted-foreground text-xs">
          {accountName}
          {item.payment_method === 'credit' && ' · kartu kredit'}
        </p>
      </div>

      <InlineRupiah
        label={`Nominal ${item.name}`}
        value={item.amount}
        save={(amount) => updateItemAmountAction(item.id, amount)}
        className="w-36"
      />

      {/* Only manual rows are removable; generated ones come back next month. */}
      {item.source_id === null && item.category !== 'card_bill' && (
        <DeleteButton id={item.id} label={item.name} action={deleteItemAction} />
      )}
    </div>
  )
}
