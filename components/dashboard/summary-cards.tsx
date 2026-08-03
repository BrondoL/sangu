import { TriangleAlert } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatRupiah } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { MonthlySummary } from '@/lib/types'

function Stat({
  label,
  value,
  hint,
  tone = 'neutral',
}: {
  label: string
  value: string
  hint?: string
  tone?: 'neutral' | 'good' | 'bad'
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-muted-foreground text-sm font-normal">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p
          className={cn(
            'text-2xl font-semibold',
            tone === 'good' && 'text-[#006300] dark:text-[#0ca30c]',
            tone === 'bad' && 'text-destructive'
          )}
        >
          {value}
        </p>
        {hint && <p className="text-muted-foreground mt-1 text-xs">{hint}</p>}
      </CardContent>
    </Card>
  )
}

export function SummaryCards({
  summary,
  actualSalary,
}: {
  summary: MonthlySummary
  actualSalary: number | null
}) {
  const hasProxy = !summary.warnings.includes('no_proxy')
  const sufficiency = summary.sufficiencyVsActual ?? summary.sufficiencyVsBase

  return (
    <div className="space-y-4">
      {summary.warnings.length > 0 && (
        <div className="border-destructive/40 text-destructive flex items-start gap-2 rounded-md border p-3 text-sm">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          <div>
            {summary.warnings.includes('no_proxy') && (
              <p>Belum ada rekening yang ditandai sebagai proxy — angka transfer tidak dihitung.</p>
            )}
            {summary.warnings.includes('no_salary_receiver') && (
              <p>Belum ada rekening penerima gaji.</p>
            )}
          </div>
        </div>
      )}

      {/* Hero: the one number this whole app exists to answer. */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-muted-foreground text-sm font-normal">
            Transfer ke rekening proxy
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-4xl font-semibold">
            {summary.transferToProxy === null ? '—' : formatRupiah(summary.transferToProxy)}
          </p>
          <p className="text-muted-foreground mt-1 text-xs">
            {summary.transferToProxy === null
              ? hasProxy
                ? 'Isi gaji aktual bulan ini untuk menghitung.'
                : 'Tandai satu rekening sebagai proxy di Pengaturan.'
              : 'Kekurangan rekening non-penerima gaji + sisa gaji.'}
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat
          label="Gaji aktual"
          value={actualSalary === null ? '—' : formatRupiah(actualSalary)}
          hint={actualSalary === null ? 'Belum diisi di Bulan Ini' : undefined}
        />
        <Stat label="Total kebutuhan" value={formatRupiah(summary.totalExpense)} />
        <Stat
          label={summary.sufficiencyVsActual === null ? 'Sisa vs gaji base' : 'Sisa gaji'}
          value={formatRupiah(sufficiency)}
          tone={sufficiency < 0 ? 'bad' : 'good'}
          hint={
            summary.sufficiencyVsActual === null
              ? undefined
              : `Vs gaji base: ${formatRupiah(summary.sufficiencyVsBase)}`
          }
        />
      </div>
    </div>
  )
}
