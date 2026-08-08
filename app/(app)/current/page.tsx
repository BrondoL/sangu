import { Suspense } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { MonthPicker } from '@/components/month-picker'
import { Eyebrow, PageHeader } from '@/components/kwitansi'
import { TopPanel } from '@/components/current/top-panel'
import { ItemGroup } from '@/components/current/item-group'
import { AddItemDialog } from '@/components/current/add-item-dialog'
import { ExcludedNote } from '@/components/current/excluded-note'
import { GenerateButton } from '@/components/current/generate-button'
import { DeleteButton } from '@/components/delete-button'
import { deleteMonthAction } from '@/app/(app)/current/actions'
import { listAccounts } from '@/lib/queries/accounts'
import { getPeriod, getItems, getBalances } from '@/lib/queries/periods'
import { currentMonthParam, formatMonthLabel, toMonthParam } from '@/lib/month'
import { formatRupiah } from '@/lib/format'
import { describePeriodContents } from '@/lib/period-summary'
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
    <PageHeader title="Bulan Ini">
      <Suspense fallback={null}>
        <MonthPicker defaultMonth={month} />
      </Suspense>
    </PageHeader>
  )

  if (!period) {
    return (
      <div>
        {header}
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <div className="space-y-1.5">
              <p className="text-sm font-medium">
                {formatMonthLabel(month)} belum dibuka
              </p>
              <p className="text-muted-foreground max-w-xs text-sm text-balance">
                Menyalin definisi yang masih aktif jadi daftar bulan ini. Nominal
                mengikuti bulan lalu bila ada.
              </p>
            </div>
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

  // Zero counts as empty for both the salary and the balances: a Rp 0 figure
  // was never really entered, and counting it would pad the warning.
  const monthLabel = formatMonthLabel(month)
  const contents = describePeriodContents({
    itemCount: items.length,
    paidCount: items.filter((i) => i.is_paid).length,
    balanceCount: balances.filter((b) => b.balance !== 0).length,
    hasActualSalary: period.actual_salary !== null && period.actual_salary !== 0,
    hasNote: (period.note ?? '').trim() !== '',
  })

  return (
    <div className="space-y-4">
      {header}

      <TopPanel
        periodId={period.id}
        actualSalary={period.actual_salary}
        note={period.note}
        accounts={activeAccounts}
        balances={balances}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <span>
          <Eyebrow>Total kebutuhan</Eyebrow>
          <span className="amount ml-2.5 text-sm font-medium">
            {formatRupiah(total)}
          </span>
        </span>
        <div className="flex gap-2">
          <AddItemDialog periodId={period.id} accounts={activeAccounts} />
          <GenerateButton month={month} label="Sinkron definisi" variant="outline" />
        </div>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-muted-foreground mx-auto max-w-sm text-sm text-balance">
              Belum ada item. Tambah satu secara manual, atau lengkapi definisi di
              Pengaturan lalu tekan &ldquo;Sinkron definisi&rdquo;.
            </p>
          </CardContent>
        </Card>
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

      {period.excluded_source_ids.length > 0 && (
        <ExcludedNote
          periodId={period.id}
          month={month}
          count={period.excluded_source_ids.length}
        />
      )}

      {/* Foot of the page on purpose: Tambah item and Sinkron definisi are
          pressed often, and this is not something to have next to them. */}
      <div className="px-1">
        <DeleteButton
          id={period.id}
          label={monthLabel}
          triggerLabel={`Hapus ${monthLabel}`}
          description={contents}
          consequence="Semuanya hilang. Definisi di Pengaturan tidak disentuh, dan bulan ini bisa dibuka lagi kapan saja."
          action={deleteMonthAction}
        />
      </div>
    </div>
  )
}
