import { Suspense } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { MonthPicker } from '@/components/month-picker'
import { Amount, Eyebrow, MoneyRow, PageHeader, SectionHead } from '@/components/kwitansi'
import { DeleteButton } from '@/components/delete-button'
import { CaptureForm } from '@/components/spending/capture-form'
import { BudgetRow } from '@/components/spending/budget-row'
import { EditDialog } from '@/components/spending/edit-dialog'
import {
  listBudgetsForMonth,
  ensureBudgetSnapshots,
  getSpendingForMonth,
  listNotes,
  listAllRecurringWithTracking,
} from '@/lib/queries/spending'
import { summarizeBudgetMonth } from '@/lib/budget'
import {
  currentMonthParam,
  currentDateParam,
  toMonthParam,
  toIsoMonth,
  formatMonthLabel,
  formatDateLabel,
} from '@/lib/month'
import { formatRupiah } from '@/lib/format'
import {
  addSpendingAction,
  updateSpendingAction,
  deleteSpendingAction,
} from './actions'

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

  const [spending, notes, allRecurring] = await Promise.all([
    getSpendingForMonth(month),
    listNotes(),
    // Only so the edit dialog can name a pos that is no longer on the page —
    // see `posOptions` below. Nothing on screen is drawn from this list.
    listAllRecurringWithTracking(),
  ])

  const summary = summarizeBudgetMonth({
    budgets,
    spending: spending.map((s) => ({
      recurringExpenseId: s.recurring_expense_id,
      amount: s.amount,
    })),
  })

  // Every row on screen, not only the unattached ones: a row that is not listed
  // is a row that can never be corrected or deleted. A budget that is no longer
  // tracked has no name to show, so its spending reads as tak terduga —
  // matching where summarizeBudgetMonth now counts it.
  const budgetName = new Map(budgets.map((b) => [b.id, b.name]))
  const label = (recurringExpenseId: string | null) =>
    (recurringExpenseId === null ? null : budgetName.get(recurringExpenseId)) ??
    'Tak terduga'

  // What tells one irreversible edit or delete from another: several rows in a
  // month can carry the same amount, and the date, the pos and the note are
  // what say which one is being opened.
  const describe = (s: (typeof spending)[number]) =>
    `${formatDateLabel(s.occurred_on)} · ${label(s.recurring_expense_id)}${
      s.note ? ` · ${s.note}` : ''
    }`

  // A row filed against a budget that is untracked or retired still has to be
  // editable without being refiled: the select needs its current pos in it,
  // named, even though the list shows the row as tak terduga and no budget line
  // above claims it. The suffix says why it is not one of the others — leaving
  // it unmarked would read as an ordinary tracked pos and invite filing more
  // spending into a budget this page does not follow.
  const otherName = new Map(
    allRecurring.map((r) => [
      r.id,
      `${r.name} (${r.tracked ? 'non-aktif' : 'tidak dilacak'})`,
    ])
  )
  const posOptions = (recurringExpenseId: string | null) =>
    recurringExpenseId === null || budgetName.has(recurringExpenseId)
      ? budgets
      : [
          ...budgets,
          {
            id: recurringExpenseId,
            name: otherName.get(recurringExpenseId) ?? 'Pos lain',
          },
        ]

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

      <Card>
        <CardContent>
          <SectionHead title={`Budget ${formatMonthLabel(month)}`} />

          {budgets.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Belum ada pos yang dilacak. Pilih dulu di Pengaturan → Dilacak.
              Sampai itu, semua pengeluaran masuk tak terduga.
            </p>
          ) : (
            <ul className="divide-border -mt-1 divide-y">
              {summary.lines.map((line) => (
                <BudgetRow key={line.id} line={line} />
              ))}
            </ul>
          )}

          {/*
            The card has to add up to the month. Listing only the tracked
            budgets left the money spent outside them off the one card that
            claims to summarise the month — it was findable, but only by
            reading the section below and adding.

            Tak terduga has no budget behind it, so it gets no bar and no
            "sisa"/"lebih": the hint says why the figure stands alone rather
            than leaving it looking like a row missing half its data. Both
            figures come from `summarizeBudgetMonth` — nothing is added here.
          */}
          <MoneyRow
            label="Tak terduga"
            hint="Tanpa pos, jadi tidak ada budget untuk membandingkannya."
            value={summary.unattachedTotal}
            strong
          />
          <MoneyRow
            label={<Eyebrow>Jumlah</Eyebrow>}
            value={summary.totalSpent}
            strong
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          {/* Named for the month on screen, not "bulan ini", which is a lie
              whenever the picker is on a past month. The totals used to sit
              here because the card above did not carry them; now that it
              closes with tak terduga and a jumlah, this heading only has to
              say how many rows are under it. */}
          <SectionHead
            title={`Catatan ${formatMonthLabel(month)}`}
            aside={spending.length === 0 ? undefined : `${spending.length} baris`}
          />

          {spending.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Belum ada pengeluaran di {formatMonthLabel(month)}.
            </p>
          ) : (
            <ul className="divide-border -mt-1 divide-y">
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
                  <Amount value={s.amount} size="sm" className="shrink-0" />
                  {/* Both dialogs name the entry, not a budget. Passing the
                      note-or-pos alone produced "Hapus Jajan?" on any attached
                      row without a note — and "Jajan" is also a budget row a
                      few centimetres up the page. The amount and the date are
                      what identify one irreversible delete from another.

                      The two controls sit in one group, pulled back to the
                      card edge, so the pair reads as this row's controls
                      rather than as two things pushing at the amount. */}
                  <span className="-mr-2 flex shrink-0 items-center">
                    <EditDialog
                      entry={s}
                      budgets={posOptions(s.recurring_expense_id)}
                      notes={notes}
                      description={describe(s)}
                      action={updateSpendingAction}
                    />
                    <DeleteButton
                      id={s.id}
                      label={formatRupiah(s.amount)}
                      description={describe(s)}
                      action={deleteSpendingAction}
                    />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
