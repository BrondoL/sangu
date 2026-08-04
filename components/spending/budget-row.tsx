import { formatRupiah } from '@/lib/format'
import type { BudgetLine } from '@/lib/budget'

export function BudgetRow({ line }: { line: BudgetLine }) {
  // A month with no snapshot has no budget to grade against. It is a gap, not a
  // zero: no bar, no "Sisa", no "Lebih", and never "Rp 0" — printing that would
  // claim the month was budgeted at nothing, which is a different statement
  // from not knowing. Riwayat already words it exactly this way.
  const over = line.over !== null && line.over > 0
  // `fill` arrives already clamped from lib/budget.ts — the component does no
  // arithmetic of its own beyond turning a fraction into a percentage string.
  const filled = line.fill * 100

  return (
    <li className="space-y-1.5 py-3">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm">{line.name}</span>
        <span className="amount text-muted-foreground text-xs">
          {line.budget === null ? (
            <>
              {formatRupiah(line.spent)}{' '}
              <span className="text-muted-foreground">/ budget belum tercatat</span>
            </>
          ) : (
            `${formatRupiah(line.spent)} / ${formatRupiah(line.budget)}`
          )}
        </span>
      </div>

      {line.budget === null ? (
        <div className="bg-muted h-1.5 w-full rounded-full" />
      ) : (
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
      )}

      <p className="text-muted-foreground text-xs">
        {line.budget === null
          ? 'Belum ada budget tercatat, jadi sisanya tidak bisa dihitung.'
          : over
            ? `Lebih ${formatRupiah(line.over)}`
            : `Sisa ${formatRupiah(line.remaining)}`}
      </p>
    </li>
  )
}
