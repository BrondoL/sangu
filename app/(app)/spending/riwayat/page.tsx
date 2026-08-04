import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Eyebrow, PageHeader } from '@/components/kwitansi'
import { SeriesRow } from '@/components/spending/series-row'
import { listTrackedBudgets, getSpendingHistory } from '@/lib/queries/spending'
import {
  compareAcrossMonths,
  suggestAdjustment,
  groupUnattached,
} from '@/lib/budget'
import { currentMonthParam, shiftMonth, toMonthParam, formatMonthLabel } from '@/lib/month'
import { formatRupiah } from '@/lib/format'
import { applyAdjustmentAction } from '../actions'

const WINDOW = 6

export default async function SpendingHistoryPage() {
  const current = currentMonthParam()
  const months = Array.from({ length: WINDOW }, (_, i) =>
    toMonthParam(shiftMonth(current, i - (WINDOW - 1)))
  )

  const budgets = await listTrackedBudgets()
  const { snapshots, spending } = await getSpendingHistory(months)

  const series = compareAcrossMonths({
    budgets: budgets.map((b) => ({ id: b.id, name: b.name })),
    snapshots,
    spending,
    months,
  })

  const budgetById = new Map(budgets.map((b) => [b.id, b.amount]))
  const activeById = new Map(budgets.map((b) => [b.id, b.isActive]))
  const newBudgets = groupUnattached({
    spending: spending
      .filter((s) => s.recurringExpenseId === null)
      .map((s) => ({ month: s.month, note: s.note, amount: s.amount })),
  })

  return (
    <div className="space-y-4">
      <PageHeader
        title="Riwayat budget"
        lead={`${formatMonthLabel(months[0])} — ${formatMonthLabel(months[months.length - 1])}`}
      >
        <Link href="/spending" className="text-muted-foreground text-sm underline">
          Kembali
        </Link>
      </PageHeader>

      <Card>
        <CardContent>
          {series.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Belum ada pos yang dilacak.
            </p>
          ) : (
            <ul className="divide-border divide-y">
              {series.map((s) => (
                <SeriesRow
                  key={s.id}
                  series={s}
                  // The table below still draws all six months, this one
                  // included. Only the verdict skips it: a month still being
                  // lived is a part-month, and grading it both distorts the
                  // median and stops an accepted suggestion from retiring.
                  adjustment={suggestAdjustment(s, current)}
                  currentBudget={budgetById.get(s.id) ?? 0}
                  isActive={activeById.get(s.id) ?? true}
                  action={applyAdjustmentAction}
                />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-2.5">
          <Eyebrow>Mungkin budget baru</Eyebrow>
          {newBudgets.length === 0 ? (
            <p className="text-muted-foreground text-xs">
              Belum ada catatan tak terduga yang berulang cukup sering.
            </p>
          ) : (
            <ul className="divide-border divide-y">
              {newBudgets.map((g) => (
                <li key={g.note} className="flex items-baseline gap-3 py-2">
                  <span className="flex-1 text-sm">{g.note}</span>
                  <span className="text-muted-foreground text-xs">
                    {g.months} bulan
                  </span>
                  <span className="amount text-sm">{formatRupiah(g.total)}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="text-muted-foreground text-xs">
            Pengeluaran tak terduga yang namanya berulang. Kalau memang rutin,
            daftarkan sebagai pengeluaran rutin di Pengaturan lalu centang di
            tab Dilacak.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
