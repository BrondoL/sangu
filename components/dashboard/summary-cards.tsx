import { TriangleAlert } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Amount, Eyebrow } from '@/components/kwitansi'
import { CopyAmount } from './copy-amount'
import { formatRupiah } from '@/lib/format'
import { terbilangRupiah } from '@/lib/terbilang'
import type { MonthlySummary } from '@/lib/types'

function Stat({
  label,
  value,
  hint,
  tone = 'default',
}: {
  label: string
  value: number | null
  hint?: string
  tone?: 'default' | 'surplus' | 'deficit'
}) {
  return (
    <div className="border-rule px-4 py-3 not-last:border-b sm:not-last:border-r sm:not-last:border-b-0">
      <Eyebrow>{label}</Eyebrow>
      <div className="mt-1.5">
        <Amount value={value} size="lg" tone={tone} />
      </div>
      {hint && <p className="text-muted-foreground mt-1 text-xs">{hint}</p>}
    </div>
  )
}

export function SummaryCards({
  summary,
  actualSalary,
}: {
  summary: MonthlySummary
  actualSalary: number | null
}) {
  const freeMoney = summary.freeMoney ?? summary.freeMoneyVsBase
  const short = freeMoney < 0
  // The gap between what the month costs and what the salary has to find is
  // money that was already sitting where it was needed.
  const coveredByBalances = summary.totalExpense - summary.totalShortfall

  // Why the transfer figure is missing, in the order the user can act on it.
  const missingRoles = [
    summary.warnings.includes('no_proxy') && 'proxy',
    summary.warnings.includes('no_salary_receiver') && 'penerima gaji',
  ].filter(Boolean)
  const transferHint =
    missingRoles.length > 0
      ? `Tandai rekening ${missingRoles.join(' dan ')} di Pengaturan.`
      : 'Isi gaji aktual bulan ini untuk menghitung.'

  return (
    <div className="space-y-4">
      {summary.warnings.length > 0 && (
        <div className="border-destructive/35 bg-destructive/5 text-destructive flex items-start gap-2.5 rounded-lg border p-3 text-sm">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          <div className="space-y-0.5">
            {summary.warnings.includes('no_proxy') && (
              <p>Belum ada rekening yang ditandai sebagai proxy.</p>
            )}
            {summary.warnings.includes('no_salary_receiver') && (
              <p>Belum ada rekening penerima gaji.</p>
            )}
            <p className="opacity-80">
              Angka transfer tidak dihitung sampai keduanya ditandai.
            </p>
          </div>
        </div>
      )}

      {/*
        The slip. This one number is why the app exists, so it is set the way a
        bank slip sets it: the figure, a rule, then the same figure in words.
        The words are not decoration — eight digits of rupiah are easy to misread
        by a factor of ten, and reading them back is how you catch that.
      */}
      <Card className="border-primary relative border-l-3 py-0">
        <CardContent className="px-5 py-5">
          <div className="flex items-start justify-between gap-3">
            <Eyebrow>Transfer ke rekening proxy</Eyebrow>
            {summary.transferToProxy !== null && (
              <div className="-mt-1.5 -mr-2 shrink-0">
                <CopyAmount value={summary.transferToProxy} />
              </div>
            )}
          </div>

          <div className="mt-2.5">
            <Amount value={summary.transferToProxy} size="hero" />
          </div>

          {summary.transferToProxy === null ? (
            <p className="text-muted-foreground mt-3 text-sm">{transferHint}</p>
          ) : (
            <div className="border-rule mt-4 border-t pt-3">
              <Eyebrow>Terbilang</Eyebrow>
              <p className="mt-1 text-sm leading-relaxed text-balance">
                {terbilangRupiah(summary.transferToProxy)}
              </p>
              {/* Without this the figure looks wrong: it exceeds the salary,
                  because part of it was already sitting in the receiver. */}
              {summary.receiverSurplus > 0 && (
                <p className="text-muted-foreground mt-2 text-xs text-balance">
                  Termasuk {formatRupiah(summary.receiverSurplus)} yang sudah ada
                  di rekening penerima gaji dan tidak terpakai bulan ini.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="py-0">
        <div className="grid sm:grid-cols-3">
          <Stat
            label="Gaji aktual"
            value={actualSalary}
            hint={actualSalary === null ? 'Belum diisi di Bulan Ini' : undefined}
          />
          <Stat
            label="Total kebutuhan"
            value={summary.totalExpense}
            hint={
              coveredByBalances > 0
                ? `${formatRupiah(coveredByBalances)} sudah tertutup saldo`
                : undefined
            }
          />
          {/* Not "sisa gaji": part of this was already in the receiver, not out
              of this month's pay. It is what the proxy still holds once every
              short account has been topped up — and when there is not enough to
              go round it is a hole, not free money, so it changes its name and
              drops the minus sign rather than reading "Uang bebas −3.500.000". */}
          <Stat
            label={`${short ? 'Kurang' : 'Uang bebas'}${
              summary.freeMoney === null ? ' vs gaji base' : ''
            }`}
            value={Math.abs(freeMoney)}
            tone={short ? 'deficit' : 'surplus'}
            hint={
              short
                ? `Gaji tidak menutup kekurangan ${formatRupiah(summary.netShortfall)}`
                : `Setelah menutup kekurangan ${formatRupiah(summary.netShortfall)}`
            }
          />
        </div>
      </Card>
    </div>
  )
}
