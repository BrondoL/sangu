import { CircleCheck, Circle, CircleAlert } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatRupiah } from '@/lib/format'
import { formatMonthLabel } from '@/lib/month'
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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-muted-foreground text-sm">{label}</span>
      <span className="text-sm tabular-nums">{value}</span>
    </div>
  )
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
  const percent =
    progressRatio === null ? null : Math.round(progressRatio * 100)

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">{goal.name}</CardTitle>
            <p className="text-muted-foreground mt-1 text-xs">
              {accountName} · {formatRupiah(goal.monthly_amount)}/bulan
            </p>
          </div>
          {onTrack === null ? (
            goal.target_amount === null && (
              <Badge variant="outline">Tanpa target nominal</Badge>
            )
          ) : onTrack ? (
            <Badge variant="secondary">Sesuai target</Badge>
          ) : (
            <Badge variant="destructive">Meleset dari target</Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {percent !== null && target !== null && (
          <div className="space-y-1.5">
            <div
              className="bg-muted h-2 w-full overflow-hidden rounded-full"
              role="progressbar"
              aria-label={`Progres ${goal.name}`}
              aria-valuenow={percent}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="h-full rounded-full"
                style={{ width: `${percent}%`, background: 'var(--chart-1)' }}
              />
            </div>
            <p className="text-muted-foreground text-xs">
              {percent}% terkumpul dari {formatRupiah(target)}
            </p>
          </div>
        )}

        <div className="space-y-1">
          <Row label="Sudah terkumpul" value={formatRupiah(accumulated)} />
          {remaining !== null && (
            <Row label="Sisa" value={formatRupiah(remaining)} />
          )}
          <Row
            label="Perkiraan tercapai"
            value={completionMonth ? formatMonthLabel(completionMonth) : '—'}
          />
          {goal.target_date && (
            <Row label="Target tanggal" value={formatDate(goal.target_date)} />
          )}
        </div>

        <div className="flex items-center gap-2 border-t pt-3 text-sm">
          {savedThisMonth === null ? (
            <>
              <CircleAlert
                className="text-muted-foreground size-4 shrink-0"
                aria-hidden
              />
              <span className="text-muted-foreground">
                Belum ada setoran {formatMonthLabel(month)} — buat di Bulan Ini.
              </span>
            </>
          ) : savedThisMonth.isPaid ? (
            <>
              <CircleCheck
                className="size-4 shrink-0 text-[#006300] dark:text-[#0ca30c]"
                aria-hidden
              />
              <span>
                Sudah menabung {formatMonthLabel(month)} ·{' '}
                <span className="tabular-nums">
                  {formatRupiah(savedThisMonth.amount)}
                </span>
              </span>
            </>
          ) : (
            <>
              <Circle className="text-muted-foreground size-4 shrink-0" aria-hidden />
              <span className="text-muted-foreground">
                Belum menabung {formatMonthLabel(month)} ·{' '}
                <span className="tabular-nums">
                  {formatRupiah(savedThisMonth.amount)}
                </span>
              </span>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
