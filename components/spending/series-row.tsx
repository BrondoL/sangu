import { formatRupiah } from '@/lib/format'
import { formatMonthLabel } from '@/lib/month'
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
        <span className="amount text-muted-foreground text-xs">
          budget sekarang {formatRupiah(currentBudget)}
        </span>
      </div>

      <table className="w-full text-xs">
        <tbody>
          {series.points.map((p) => (
            <tr key={p.month}>
              <td className="text-muted-foreground py-1">
                {formatMonthLabel(p.month)}
              </td>
              <td className="amount py-1 text-right">
                {/* A month with no snapshot is a gap. Printing 0 here would
                    read as "spent nothing", which is a different claim. */}
                {p.budget === null ? (
                  <span className="text-muted-foreground">belum tercatat</span>
                ) : (
                  `${formatRupiah(p.spent)} / ${formatRupiah(p.budget)}`
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
