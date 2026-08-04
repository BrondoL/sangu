import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Amount, MoneyRow, PageHeader, SectionHead } from '@/components/kwitansi'
import { SeriesRow } from '@/components/spending/series-row'
import { listTrackedBudgets, getSpendingHistory } from '@/lib/queries/spending'
import {
  compareAcrossMonths,
  suggestAdjustment,
  poolUnattached,
  groupUnattached,
} from '@/lib/budget'
import { currentMonthParam, shiftMonth, toMonthParam, formatMonthLabel } from '@/lib/month'
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
  // Every row no series above can claim, pooled from the same budget list the
  // series were built from so the two cannot disagree. Filtering on
  // `recurringExpenseId === null` alone left spending on an untracked budget in
  // neither half of the page — it matched no series and was kept out of the
  // grouping — while Belanja counts that same money as tak terduga.
  const unattached = poolUnattached({
    spending,
    budgetIds: budgets.map((b) => b.id),
  })
  const newBudgets = groupUnattached({ spending: unattached.spending })

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
          {/* The unit sits in the header because the tables below are set in
              digits only, the way the dashboard's account table is. */}
          <SectionHead title="Pos yang dilacak" aside="dalam rupiah" />

          {series.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Belum ada pos yang dilacak.
            </p>
          ) : (
            <ul className="divide-border -mt-2 divide-y">
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
        <CardContent>
          {/* The total is beside the heading because the list below cannot
              hold it: grouping is by note, so a row with no note — or a note
              that never repeats — reaches no group. Without this figure that
              money is nowhere on the page. */}
          <SectionHead
            title="Mungkin budget baru"
            aside={
              // Inline rather than a nested flex row: at 360px the label and
              // the figure need to be able to wrap under each other instead of
              // pushing the heading beside them off the card.
              <>
                total tak terduga{' '}
                <Amount
                  value={unattached.total}
                  size="sm"
                  className="text-foreground"
                />
              </>
            }
          />
          {newBudgets.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Belum ada catatan tak terduga yang berulang cukup sering.
            </p>
          ) : (
            <ul className="divide-border/60 -my-1 divide-y">
              {newBudgets.map((g) => (
                <li key={g.note}>
                  <MoneyRow
                    label={g.note}
                    hint={`${g.months} bulan`}
                    value={g.total}
                  />
                </li>
              ))}
            </ul>
          )}
          <p className="text-muted-foreground border-rule mt-3 border-t pt-3 text-xs">
            Pengeluaran tak terduga yang namanya berulang. Kalau memang rutin,
            daftarkan sebagai pengeluaran rutin di Pengaturan lalu centang di
            tab Dilacak. Totalnya menghitung semua pengeluaran di rentang ini
            yang tidak punya pos di daftar atas — termasuk yang tanpa catatan
            dan yang posnya sudah tidak dilacak lagi.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
