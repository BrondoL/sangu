import { Amount } from '@/components/kwitansi'
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
      {/* The spent figure is the row's headline and sits on the money rail, the
          same shape a goal card uses: the amount reached above the bar, what it
          is measured against as a caption below. It used to be half of a
          "Rp a / Rp b" pair set in muted extra-small, which put the one figure
          this page exists to show in the quietest type on it. */}
      <div className="flex items-baseline justify-between gap-3">
        <span className="min-w-0 truncate text-sm">{line.name}</span>
        <Amount value={line.spent} size="sm" tone={over ? 'deficit' : 'default'} />
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
            ? `dari ${formatRupiah(line.budget)} · lebih ${formatRupiah(line.over)}`
            : `dari ${formatRupiah(line.budget)} · sisa ${formatRupiah(line.remaining)}`}
      </p>
    </li>
  )
}
