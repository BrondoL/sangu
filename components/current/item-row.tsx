'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'
import { Checkbox } from '@/components/ui/checkbox'
import { InlineRupiah } from './inline-rupiah'
import { DeleteButton } from '@/components/delete-button'
import { cn } from '@/lib/utils'
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
    <div className="flex items-center gap-3 py-2.5">
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
          className={cn(
            'truncate text-sm leading-tight',
            item.is_paid && 'text-muted-foreground line-through'
          )}
        >
          {item.name}
        </p>
        {/* An account name is content, so it stays in sentence case — only
            labels and column heads wear the uppercase eyebrow. */}
        <p className="text-muted-foreground text-xs">
          {accountName}
          {item.payment_method === 'credit' && ' · kartu kredit'}
        </p>
      </div>

      <InlineRupiah
        label={`Nominal ${item.name}`}
        value={item.amount}
        save={(amount) => updateItemAmountAction(item.id, amount)}
        className="w-32 shrink-0 sm:w-36"
      />

      {/* Card bills are keyed by account rather than by a definition, so the
          exclusion that keeps a deleted row deleted has nothing to record for
          them — they stay undeletable. Manual rows are always 'expense'
          (add-item-dialog posts it as a hidden field), so dropping the old
          source_id check admits exactly the generated rows and nothing else. */}
      {item.category !== 'card_bill' && (
        <DeleteButton
          id={item.id}
          label={item.name}
          consequence={
            item.source_id === null
              ? undefined
              : 'Hilang dari bulan ini saja. Definisinya di Pengaturan tidak disentuh, dan bulan depan muncul lagi seperti biasa.'
          }
          action={deleteItemAction}
        />
      )}
    </div>
  )
}
