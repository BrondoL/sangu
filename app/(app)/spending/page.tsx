import { Suspense } from 'react'
import Link from 'next/link'
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
  toIsoMonth,
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
  const current = currentMonthParam()
  const month = toMonthParam(monthParam ?? current)
  const isCurrentMonth = month === current

  // Snapshot first, then read the snapshot back: the figures on screen are the
  // ones that applied in `month`, not the ones that apply today.
  //
  // Only ever for the current month. Snapshotting whatever month the picker
  // lands on would copy today's default_amount into June and record it as
  // June's budget — inventing the history budget_months exists to protect,
  // with no way to undo it from the app. A past month with no snapshot stays a
  // gap, which is the honest answer.
  if (isCurrentMonth) await ensureBudgetSnapshots(month)
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

  // Every row on screen, not only the unattached ones: a row that is not listed
  // is a row that can never be deleted, and this ledger has no edit path. A
  // budget that is no longer tracked has no name to show, so its spending reads
  // as tak terduga — matching where summarizeBudgetMonth now counts it.
  const budgetName = new Map(budgets.map((b) => [b.id, b.name]))
  const label = (recurringExpenseId: string | null) =>
    (recurringExpenseId === null ? null : budgetName.get(recurringExpenseId)) ??
    'Tak terduga'

  return (
    <div className="space-y-4">
      <PageHeader title="Belanja" lead={formatMonthLabel(month)}>
        <Link href="/spending/riwayat" className="text-muted-foreground text-sm underline">
          Riwayat
        </Link>
        <Suspense fallback={null}>
          <MonthPicker defaultMonth={month} />
        </Suspense>
      </PageHeader>

      {/* The date follows the month on screen. Defaulting to today while July is
          open filed every entry into August — four success toasts, and nothing
          changing on the page that was being caught up. Still editable. */}
      <CaptureForm
        budgets={budgets}
        notes={notes}
        defaultDate={isCurrentMonth ? currentDateParam() : toIsoMonth(month)}
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
            <Eyebrow>Catatan bulan ini</Eyebrow>
            <span className="text-muted-foreground text-xs">
              tak terduga{' '}
              <span className="amount text-foreground text-sm">
                {formatRupiah(summary.unattachedTotal)}
              </span>
            </span>
          </div>

          {spending.length === 0 ? (
            <p className="text-muted-foreground text-xs">
              Belum ada pengeluaran bulan ini.
            </p>
          ) : (
            <ul className="divide-border divide-y">
              {spending.map((s) => (
                <li key={s.id} className="flex items-center gap-3 py-2">
                  <span className="amount text-muted-foreground text-xs">
                    {s.occurred_on.slice(8, 10)}/{s.occurred_on.slice(5, 7)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm">
                      {label(s.recurring_expense_id)}
                    </span>
                    {s.note && (
                      <span className="text-muted-foreground block truncate text-xs">
                        {s.note}
                      </span>
                    )}
                  </span>
                  <span className="amount text-sm">{formatRupiah(s.amount)}</span>
                  <DeleteButton
                    id={s.id}
                    label={s.note ?? label(s.recurring_expense_id)}
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
