import { Suspense } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { MonthPicker } from '@/components/month-picker'
import { TopPanel } from '@/components/current/top-panel'
import { ItemGroup } from '@/components/current/item-group'
import { AddItemDialog } from '@/components/current/add-item-dialog'
import { GenerateButton } from '@/components/current/generate-button'
import { listAccounts } from '@/lib/queries/accounts'
import { getPeriod, getItems, getBalances } from '@/lib/queries/periods'
import { currentMonthParam, formatMonthLabel, toMonthParam } from '@/lib/month'
import { formatRupiah } from '@/lib/format'
import type { Category } from '@/lib/types'

const GROUPS: { category: Category; title: string }[] = [
  { category: 'expense', title: 'Pengeluaran' },
  { category: 'installment', title: 'Cicilan' },
  { category: 'saving', title: 'Tabungan' },
  { category: 'card_bill', title: 'Tagihan kartu kredit' },
]

export default async function CurrentPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  const { month: monthParam } = await searchParams
  const month = toMonthParam(monthParam ?? currentMonthParam())

  const [accounts, period] = await Promise.all([listAccounts(), getPeriod(month)])
  const activeAccounts = accounts.filter((a) => a.is_active)

  const header = (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold">Bulan Ini</h1>
      <Suspense fallback={null}>
        <MonthPicker defaultMonth={month} />
      </Suspense>
    </div>
  )

  if (!period) {
    return (
      <div className="space-y-6">
        {header}
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
            <p className="text-muted-foreground text-sm">
              Belum ada data untuk {formatMonthLabel(month)}.
            </p>
            <GenerateButton month={month} />
          </CardContent>
        </Card>
      </div>
    )
  }

  const [items, balances] = await Promise.all([
    getItems(period.id),
    getBalances(period.id),
  ])
  const total = items.reduce((sum, i) => sum + i.amount, 0)

  return (
    <div className="space-y-6">
      {header}

      <TopPanel
        periodId={period.id}
        actualSalary={period.actual_salary}
        note={period.note}
        accounts={activeAccounts}
        balances={balances}
      />

      <div className="flex items-center justify-between">
        <span className="text-sm">
          Total kebutuhan{' '}
          <strong className="tabular-nums">{formatRupiah(total)}</strong>
        </span>
        <div className="flex gap-2">
          <AddItemDialog periodId={period.id} accounts={activeAccounts} />
          <GenerateButton month={month} label="Sinkron definisi" variant="outline" />
        </div>
      </div>

      {items.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Belum ada item. Tambah manual, atau lengkapi definisi di Pengaturan lalu
          tekan &ldquo;Sinkron definisi&rdquo;.
        </p>
      ) : (
        <div className="space-y-4">
          {GROUPS.map(({ category, title }) => (
            <ItemGroup
              key={category}
              title={title}
              items={items.filter((i) => i.category === category)}
              accounts={accounts}
            />
          ))}
        </div>
      )}
    </div>
  )
}
