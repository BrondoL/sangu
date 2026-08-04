import { formatRupiah } from '@/lib/format'
import type { BudgetLine } from '@/lib/budget'

export function BudgetRow({ line }: { line: BudgetLine }) {
  const over = line.over > 0
  // `fill` arrives already clamped from lib/budget.ts — the component does no
  // arithmetic of its own beyond turning a fraction into a percentage string.
  const filled = line.fill * 100

  return (
    <li className="space-y-1.5 py-3">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm">{line.name}</span>
        <span className="amount text-muted-foreground text-xs">
          {formatRupiah(line.spent)} / {formatRupiah(line.budget)}
        </span>
      </div>

      <div
        className="bg-muted h-1.5 w-full overflow-hidden rounded-full"
        role="progressbar"
        aria-label={`Pemakaian ${line.name}`}
        aria-valuenow={Math.round(filled)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={`h-full rounded-full ${over ? 'bg-destructive' : 'bg-primary'}`}
          style={{ width: `${filled}%` }}
        />
      </div>

      <p className="text-muted-foreground text-xs">
        {over
          ? `Lebih ${formatRupiah(line.over)}`
          : `Sisa ${formatRupiah(line.remaining)}`}
      </p>
    </li>
  )
}
