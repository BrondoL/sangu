import { formatMonthLabel } from '@/lib/month'
import { Amount, Eyebrow } from '@/components/kwitansi'
import { AdjustButton } from '@/components/spending/adjust-button'
import { Badge } from '@/components/ui/badge'
import type { BudgetSeries, Adjustment } from '@/lib/budget'
import type { ActionState } from '@/lib/types'

/** Stated from the verdict itself, so the sentence cannot drift from the rule. */
function verdictText(adjustment: Adjustment): string {
  if (adjustment.kind === 'raise') {
    return `Lewat budget di setidaknya 3 dari ${adjustment.months} bulan yang tercatat.`
  }
  if (adjustment.kind === 'lower') {
    return `Terpakai 60% atau kurang di semua ${adjustment.months} bulan yang tercatat.`
  }
  return 'Belum ada pola yang cukup jelas untuk disetel.'
}

export function SeriesRow({
  series,
  adjustment,
  currentBudget,
  isActive,
  action,
}: {
  series: BudgetSeries
  adjustment: Adjustment
  currentBudget: number
  isActive: boolean
  action: (id: string, amount: number) => Promise<ActionState>
}) {
  return (
    <li className="space-y-2 py-4">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm">
          {series.name}
          {!isActive && (
            <Badge variant="secondary" className="ml-2 font-normal">
              Non-aktif
            </Badge>
          )}
        </span>
        <span className="text-muted-foreground shrink-0 text-xs">
          budget sekarang{' '}
          <Amount value={currentBudget} size="sm" className="text-foreground" />
        </span>
      </div>

      {/* Two columns rather than one "Rp a / Rp b" cell per month: six months of
          figures are here to be compared, and they can only be compared if they
          stack. Digits only, with the unit in the card's header — the same way
          the dashboard's account table is set. */}
      <table className="w-full text-xs">
        <thead>
          <tr className="border-border border-b">
            <th className="pb-1.5 text-left font-normal">
              <Eyebrow>Bulan</Eyebrow>
            </th>
            <th className="pb-1.5 pl-3 text-right font-normal">
              <Eyebrow>Terpakai</Eyebrow>
            </th>
            <th className="pb-1.5 pl-3 text-right font-normal">
              <Eyebrow>Budget</Eyebrow>
            </th>
          </tr>
        </thead>
        <tbody>
          {series.points.map((p) => (
            <tr key={p.month} className="border-border/60 border-b last:border-0">
              <td className="text-muted-foreground py-1.5">
                {formatMonthLabel(p.month)}
              </td>
              <td className="amount py-1.5 pl-3 text-right">
                {/* The spending in a month with no snapshot is real and still
                    has to appear — dropping it turns a month the budget was
                    never recorded in into a month lived free. */}
                {p.spent === 0 ? (
                  <span className="text-muted-foreground">—</span>
                ) : (
                  p.spent.toLocaleString('id-ID')
                )}
              </td>
              <td className="amount py-1.5 pl-3 text-right">
                {/* A month with no snapshot is a gap in the budget, never a
                    zero: printing 0 would read as "budgeted at nothing", which
                    is a different claim. */}
                {p.budget === null ? (
                  <span className="text-muted-foreground font-sans">
                    belum tercatat
                  </span>
                ) : (
                  p.budget.toLocaleString('id-ID')
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted-foreground text-xs">{verdictText(adjustment)}</p>
        {adjustment.kind !== 'ok' &&
          (isActive ? (
            <AdjustButton
              id={series.id}
              name={series.name}
              from={currentBudget}
              to={adjustment.amount}
              action={action}
            />
          ) : (
            <p className="text-muted-foreground text-xs">
              Pos ini sudah non-aktif, jadi budgetnya tidak ditawarkan untuk diubah.
            </p>
          ))}
      </div>
    </li>
  )
}
