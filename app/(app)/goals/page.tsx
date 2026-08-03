import { Card, CardContent } from '@/components/ui/card'
import { GoalCard } from '@/components/goals/goal-card'
import { getGoalProgress } from '@/lib/queries/goals'
import { getPeriod, getItems } from '@/lib/queries/periods'
import { listAccounts } from '@/lib/queries/accounts'
import { projectGoal } from '@/lib/goals'
import { currentMonthParam, formatMonthLabel, toIsoMonth } from '@/lib/month'
import { formatRupiah } from '@/lib/format'

/**
 * Always the real current month: accumulation is cross-period, so a month
 * picker here would only move the checklist while the totals stayed put.
 */
export default async function GoalsPage() {
  const month = currentMonthParam()

  const [progress, accounts, period] = await Promise.all([
    getGoalProgress(),
    listAccounts(),
    getPeriod(month),
  ])

  const items = period ? await getItems(period.id) : []
  const savingBySource = new Map(
    items
      .filter((i) => i.category === 'saving' && i.source_id)
      .map((i) => [i.source_id as string, { amount: i.amount, isPaid: i.is_paid }])
  )

  const accountName = (id: string) =>
    accounts.find((a) => a.id === id)?.name ?? '—'

  const totalAccumulated = progress.reduce((s, p) => s + p.accumulated, 0)
  const totalMonthly = progress.reduce((s, p) => s + p.goal.monthly_amount, 0)

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Target</h1>
        <p className="text-muted-foreground text-sm">
          Checklist setoran untuk {formatMonthLabel(month)}.
        </p>
      </div>

      {progress.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-muted-foreground text-sm">
              Belum ada target tabungan aktif. Tambahkan di Pengaturan → Target.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardContent className="grid grid-cols-2 gap-4 py-4">
              <div>
                <p className="text-muted-foreground text-sm">Total terkumpul</p>
                <p className="text-2xl font-semibold tabular-nums">
                  {formatRupiah(totalAccumulated)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-sm">Setoran per bulan</p>
                <p className="text-2xl font-semibold tabular-nums">
                  {formatRupiah(totalMonthly)}
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2">
            {progress.map(({ goal, accumulated }) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                accountName={accountName(goal.account_id)}
                accumulated={accumulated}
                month={month}
                savedThisMonth={savingBySource.get(goal.id) ?? null}
                projection={projectGoal({
                  targetAmount: goal.target_amount,
                  accumulated,
                  monthlyAmount: goal.monthly_amount,
                  currentMonth: toIsoMonth(month),
                  targetDate: goal.target_date,
                })}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
