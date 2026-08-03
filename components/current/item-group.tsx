import { Card, CardContent } from '@/components/ui/card'
import { SectionHead } from '@/components/kwitansi'
import { ItemRow } from './item-row'
import { formatRupiah } from '@/lib/format'
import type { Tables } from '@/lib/database.types'

export function ItemGroup({
  title,
  items,
  accounts,
}: {
  title: string
  items: Tables<'monthly_items'>[]
  accounts: Tables<'accounts'>[]
}) {
  if (items.length === 0) return null

  const total = items.reduce((sum, i) => sum + i.amount, 0)
  const paidCount = items.filter((i) => i.is_paid).length
  const nameOf = (id: string) => accounts.find((a) => a.id === id)?.name ?? '—'

  return (
    <Card>
      <CardContent>
        <SectionHead
          title={title}
          aside={
            <span className="flex items-baseline gap-2.5">
              <span>
                {paidCount}/{items.length} lunas
              </span>
              <span className="amount text-foreground">{formatRupiah(total)}</span>
            </span>
          }
        />
        <div className="divide-border/60 -my-1 divide-y">
          {items.map((item) => (
            <ItemRow
              key={item.id}
              item={item}
              accountName={nameOf(item.account_id)}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
