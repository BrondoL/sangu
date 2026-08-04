import { formatRupiah } from '@/lib/format'
import { formatMonthLabel } from '@/lib/month'
import { AdjustButton } from '@/components/spending/adjust-button'
import type { BudgetSeries, Adjustment } from '@/lib/budget'
import type { ActionState } from '@/lib/types'

const VERDICT: Record<Adjustment['kind'], string> = {
  raise: 'Lewat budget di 3 dari 4 bulan terakhir yang tercatat.',
  lower: 'Terpakai 60% atau kurang, empat bulan berturut-turut.',
  ok: 'Belum ada pola yang cukup jelas untuk disetel.',
}

export function SeriesRow({
  series,
  adjustment,
  currentBudget,
  action,
}: {
  series: BudgetSeries
  adjustment: Adjustment
  currentBudget: number
  action: (id: string, amount: number) => Promise<ActionState>
}) {
  return (
    <li className="space-y-2 py-4">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm">{series.name}</span>
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
        <p className="text-muted-foreground text-xs">{VERDICT[adjustment.kind]}</p>
        {adjustment.kind !== 'ok' && (
          <AdjustButton
            id={series.id}
            name={series.name}
            from={currentBudget}
            to={adjustment.amount}
            action={action}
          />
        )}
      </div>
    </li>
  )
}
