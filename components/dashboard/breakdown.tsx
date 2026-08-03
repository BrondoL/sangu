import { ChevronDown } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Eyebrow } from '@/components/kwitansi'
import { formatRupiah } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { MonthlySummary } from '@/lib/types'

/**
 * The derivation, written out. Every figure on the cards above appears here in
 * the order it was reached, because the alternative — a couple of terse hints
 * under each card — left the reader holding three numbers and joining them up
 * from memory.
 */
function Line({
  op,
  label,
  value,
  rule = false,
  total = false,
}: {
  op?: '−' | '+' | '='
  label: string
  value: number
  /** Draw the subtotal rule above this line. */
  rule?: boolean
  total?: boolean
}) {
  return (
    <div
      className={cn(
        'flex items-baseline gap-3 py-1',
        rule && 'border-rule mt-1 border-t pt-2',
        total && 'border-rule mt-1 border-t-2 pt-2'
      )}
    >
      <span className="amount text-muted-foreground w-3 shrink-0 text-sm">
        {op ?? ''}
      </span>
      <span className={cn('flex-1 text-sm', total && 'font-medium')}>{label}</span>
      <span className={cn('amount text-sm', total && 'font-medium')}>
        {value.toLocaleString('id-ID')}
      </span>
    </div>
  )
}

export function Breakdown({
  summary,
  actualSalary,
  baseSalary,
  receiverName,
}: {
  summary: MonthlySummary
  actualSalary: number | null
  baseSalary: number
  receiverName: string | null
}) {
  const coveredByBalances = summary.totalExpense - summary.totalShortfall
  const salary = actualSalary ?? baseSalary
  const free = summary.freeMoney ?? summary.freeMoneyVsBase
  const short = free < 0

  // Only worth a line of its own when it actually moved the number.
  const showCovered = coveredByBalances > 0
  const showSurplus = summary.receiverSurplus > 0

  const vsBase = actualSalary !== null && actualSalary !== baseSalary
  const bonus = actualSalary !== null ? actualSalary - baseSalary : 0

  // When the receiver's spare cash covers every shortfall on its own, the net
  // figure goes below zero. Printing "Harus ditutup gaji −47.000.000" is
  // arithmetically true and unreadable, so the line changes sides instead: the
  // salary gains that much rather than losing a negative amount.
  const covered = summary.netShortfall < 0
  const netLabel = covered ? 'Kelebihan yang tersisa' : 'Harus ditutup gaji'
  const netValue = Math.abs(summary.netShortfall)

  return (
    <Card>
      <CardContent>
        {/*
          Native <details>, so this stays a server component with no JavaScript
          shipped and keyboard support for free. Closed by default: it answers
          "where did these numbers come from", which is a question you ask once.
        */}
        <details className="group">
          <summary className="focus-visible:ring-ring/50 flex cursor-pointer list-none items-center justify-between gap-3 rounded-sm outline-none focus-visible:ring-3 [&::-webkit-details-marker]:hidden">
            <Eyebrow>Dari kebutuhan ke uang bebas</Eyebrow>
            <span className="text-muted-foreground group-hover:text-foreground flex items-center gap-1.5 text-xs transition-colors">
              Rincian
              <ChevronDown
                className="size-3.5 transition-transform group-open:rotate-180"
                aria-hidden
              />
            </span>
          </summary>

          <div className="border-rule mt-3 border-t pt-3">
            <p className="text-muted-foreground mb-1 text-right text-xs">
              dalam rupiah
            </p>

            <Line label="Total kebutuhan" value={summary.totalExpense} />
            {showCovered && (
              <Line
                op="−"
                label="Sudah ada di rekeningnya"
                value={coveredByBalances}
              />
            )}
            {showCovered && (
              <Line op="=" label="Kekurangan" value={summary.totalShortfall} rule />
            )}
            {showSurplus && (
              <Line
                op="−"
                label={`Kelebihan di ${receiverName ?? 'rekening penerima gaji'}`}
                value={summary.receiverSurplus}
              />
            )}
            {showSurplus && (
              <Line op="=" label={netLabel} value={netValue} rule />
            )}

            <div className="mt-4">
              <Line
                label={actualSalary === null ? 'Gaji base' : 'Gaji aktual'}
                value={salary}
              />
              <Line op={covered ? '+' : '−'} label={netLabel} value={netValue} />
              <Line
                op="="
                label={short ? 'Kurang' : 'Uang bebas'}
                value={Math.abs(free)}
                total
              />
            </div>

            {/* The spec asks for the base comparison to stay visible so a bonus
                or a deduction shows up as a number rather than a feeling. */}
            {vsBase && (
              <p className="text-muted-foreground border-rule mt-3 border-t pt-3 text-xs text-pretty">
                <Eyebrow>Vs gaji base</Eyebrow> {formatRupiah(baseSalary)} — gaji
                bulan ini {formatRupiah(Math.abs(bonus))}{' '}
                {bonus > 0 ? 'lebih besar' : 'lebih kecil'}. Dengan gaji base,{' '}
                {summary.freeMoneyVsBase < 0 ? 'kurang' : 'uang bebas'}{' '}
                {formatRupiah(Math.abs(summary.freeMoneyVsBase))}.
              </p>
            )}
          </div>
        </details>
      </CardContent>
    </Card>
  )
}
