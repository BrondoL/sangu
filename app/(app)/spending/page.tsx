import { Suspense } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { MonthPicker } from '@/components/month-picker'
import { Eyebrow, PageHeader } from '@/components/kwitansi'
import { DeleteButton } from '@/components/delete-button'
import { CaptureForm } from '@/components/spending/capture-form'
import { BudgetRow } from '@/components/spending/budget-row'
import {
  listBudgetsForMonth,
  ensureBudgetSnapshots,
  getSpendingForMonth,
  listNotes,
} from '@/lib/queries/spending'
import { summarizeBudgetMonth } from '@/lib/budget'
import {
  currentMonthParam,
  currentDateParam,
  toMonthParam,
  formatMonthLabel,
} from '@/lib/month'
import { formatRupiah } from '@/lib/format'
import { addSpendingAction, deleteSpendingAction } from './actions'

export default async function SpendingPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  const { month: monthParam } = await searchParams
  const month = toMonthParam(monthParam ?? currentMonthParam())

  // Snapshot first, then read the snapshot back: the figures on screen are the
  // ones that applied in `month`, not the ones that apply today.
  await ensureBudgetSnapshots(month)
  const budgets = await listBudgetsForMonth(month)

  const [spending, notes] = await Promise.all([
    getSpendingForMonth(month),
    listNotes(),
  ])

  const summary = summarizeBudgetMonth({
    budgets,
    spending: spending.map((s) => ({
      recurringExpenseId: s.recurring_expense_id,
      amount: s.amount,
    })),
  })

  const unattached = spending.filter((s) => s.recurring_expense_id === null)

  return (
    <div className="space-y-4">
      <PageHeader title="Belanja" lead={formatMonthLabel(month)}>
        <Suspense fallback={null}>
          <MonthPicker defaultMonth={month} />
        </Suspense>
      </PageHeader>

      <CaptureForm
        budgets={budgets}
        notes={notes}
        today={currentDateParam()}
        action={addSpendingAction}
      />

      {budgets.length === 0 ? (
        <Card>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              Belum ada pos yang dilacak. Pilih dulu di Pengaturan → Dilacak.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent>
            <ul className="divide-border divide-y">
              {summary.lines.map((line) => (
                <BudgetRow key={line.id} line={line} />
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="space-y-2.5">
          <div className="flex items-baseline justify-between gap-3">
            <Eyebrow>Tak terduga</Eyebrow>
            <span className="amount text-sm">
              {formatRupiah(summary.unattachedTotal)}
            </span>
          </div>

          {unattached.length === 0 ? (
            <p className="text-muted-foreground text-xs">
              Belum ada pengeluaran di luar pos bulan ini.
            </p>
          ) : (
            <ul className="divide-border divide-y">
              {unattached.map((s) => (
                <li key={s.id} className="flex items-center gap-3 py-2">
                  <span className="amount text-muted-foreground text-xs">
                    {s.occurred_on.slice(8, 10)}/{s.occurred_on.slice(5, 7)}
                  </span>
                  <span className="flex-1 text-sm">{s.note ?? '—'}</span>
                  <span className="amount text-sm">{formatRupiah(s.amount)}</span>
                  <DeleteButton
                    id={s.id}
                    label={s.note ?? 'catatan ini'}
                    action={deleteSpendingAction}
                  />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
