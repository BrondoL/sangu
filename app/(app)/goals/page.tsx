import { Card, CardContent } from '@/components/ui/card'
import { Amount, Eyebrow, PageHeader } from '@/components/kwitansi'
import { GoalCard } from '@/components/goals/goal-card'
import { getGoalProgress } from '@/lib/queries/goals'
import { getPeriod, getItems } from '@/lib/queries/periods'
import { listAccounts } from '@/lib/queries/accounts'
import { projectGoal } from '@/lib/goals'
import { currentMonthParam, formatMonthLabel, toIsoMonth } from '@/lib/month'

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
    <div className="space-y-4">
      <PageHeader
        title="Target"
        lead={`Checklist setoran untuk ${formatMonthLabel(month)}.`}
      />

      {progress.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mx-auto max-w-xs text-sm text-balance">
              Belum ada target tabungan aktif. Tambahkan satu di Pengaturan →
              Target, lalu sinkronkan bulan ini.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="py-0">
            <div className="grid sm:grid-cols-2">
              <div className="border-rule px-4 py-3 not-last:border-b sm:not-last:border-r sm:not-last:border-b-0">
                <Eyebrow>Total terkumpul</Eyebrow>
                <div className="mt-1.5">
                  <Amount value={totalAccumulated} size="lg" />
                </div>
              </div>
              <div className="px-4 py-3">
                <Eyebrow>Setoran per bulan</Eyebrow>
                <div className="mt-1.5">
                  <Amount value={totalMonthly} size="lg" />
                </div>
              </div>
            </div>
          </Card>

          <div className="grid items-start gap-4 sm:grid-cols-2">
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
