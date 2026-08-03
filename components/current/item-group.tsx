import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  const nameOf = (id: string) => accounts.find((a) => a.id === id)?.name ?? '—'

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">{title}</CardTitle>
        <span className="text-muted-foreground text-sm tabular-nums">
          {formatRupiah(total)}
        </span>
      </CardHeader>
      <CardContent className="divide-y">
        {items.map((item) => (
          <ItemRow key={item.id} item={item} accountName={nameOf(item.account_id)} />
        ))}
      </CardContent>
    </Card>
  )
}
