import { CircleCheck, Circle, CircleDashed } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Amount, Eyebrow, MoneyRow } from '@/components/kwitansi'
import { formatRupiah } from '@/lib/format'
import { formatMonthLabel } from '@/lib/month'
import { cn } from '@/lib/utils'
import type { GoalProjection } from '@/lib/goals'
import type { Tables } from '@/lib/database.types'

type Goal = Tables<'savings_goals'>

/**
 * `target_date` is a `date` column ('YYYY-MM-DD'). Pinning the formatter to UTC
 * keeps the day from sliding on a host in a negative-offset timezone.
 */
function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'long',
    timeZone: 'UTC',
  }).format(new Date(`${iso}T00:00:00Z`))
}

export function GoalCard({
  goal,
  accountName,
  accumulated,
  projection,
  month,
  savedThisMonth,
}: {
  goal: Goal
  accountName: string
  accumulated: number
  projection: GoalProjection
  month: string
  /**
   * This month's saving item for the goal: `null` when the month has not been
   * generated, or the goal was added after it was.
   */
  savedThisMonth: { amount: number; isPaid: boolean } | null
}) {
  const { remaining, completionMonth, onTrack, progressRatio } = projection
  const target = goal.target_amount
  const percent = progressRatio === null ? null : Math.round(progressRatio * 100)

  const status = savedThisMonth === null ? 'none' : savedThisMonth.isPaid ? 'paid' : 'due'
  const STATUS = {
    paid: {
      Icon: CircleCheck,
      className: 'text-surplus',
      text: `Sudah menabung ${formatMonthLabel(month)}`,
    },
    due: {
      Icon: Circle,
      className: 'text-muted-foreground',
      text: `Belum menabung ${formatMonthLabel(month)}`,
    },
    none: {
      Icon: CircleDashed,
      className: 'text-muted-foreground',
      text: `Belum ada setoran ${formatMonthLabel(month)}`,
    },
  }[status]

  return (
    <Card>
      <CardContent className="flex h-full flex-col">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="leading-tight font-medium">{goal.name}</h2>
            {/* Sentence case, not an eyebrow: this is content, and an uppercased
                "RP" in the middle of it reads as shouting. */}
            <p className="text-muted-foreground mt-1 text-xs">
              {accountName} · {formatRupiah(goal.monthly_amount)}/bulan
            </p>
          </div>
          {onTrack !== null && (
            <span
              className={cn(
                'eyebrow shrink-0 rounded-md px-2 py-1',
                onTrack
                  ? 'text-surplus bg-surplus/10'
                  : 'text-destructive bg-destructive/10'
              )}
            >
              {onTrack ? 'Sesuai target' : 'Meleset'}
            </span>
          )}
        </div>

        {percent !== null && target !== null && (
          <div className="mt-4 space-y-1.5">
            <div className="flex items-baseline justify-between">
              <Amount value={accumulated} size="lg" />
              <span className="amount text-muted-foreground text-xs">
                {percent}% dari {target.toLocaleString('id-ID')}
              </span>
            </div>
            <div
              className="bg-muted h-1.5 w-full overflow-hidden rounded-full"
              role="progressbar"
              aria-label={`Progres ${goal.name}`}
              aria-valuenow={percent}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="bg-primary h-full rounded-full transition-[width] duration-500"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        )}

        <div className="mt-4 flex-1">
          {/* An open-ended goal has no bar and no estimate, so the total it has
              reached is the headline instead. */}
          {target === null && (
            <div className="mb-2">
              <Eyebrow>Sudah terkumpul</Eyebrow>
              <div className="mt-1">
                <Amount value={accumulated} size="lg" />
              </div>
            </div>
          )}
          {remaining !== null && <MoneyRow label="Sisa" value={remaining} />}
          {completionMonth && (
            <div className="flex items-baseline justify-between gap-4 py-1.5">
              <span className="text-sm">Perkiraan tercapai</span>
              <span className="amount text-sm">
                {formatMonthLabel(completionMonth)}
              </span>
            </div>
          )}
          {goal.target_date && (
            <div className="flex items-baseline justify-between gap-4 py-1.5">
              <span className="text-sm">Target tanggal</span>
              <span className="text-sm">{formatDate(goal.target_date)}</span>
            </div>
          )}
        </div>

        <div className="border-rule mt-3 flex items-center gap-2 border-t pt-3 text-sm">
          <STATUS.Icon className={cn('size-4 shrink-0', STATUS.className)} aria-hidden />
          <span className={status === 'paid' ? '' : 'text-muted-foreground'}>
            {STATUS.text}
          </span>
          {savedThisMonth && (
            <span className="amount text-muted-foreground ml-auto text-xs">
              {formatRupiah(savedThisMonth.amount)}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
