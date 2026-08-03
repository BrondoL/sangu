import { Suspense } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MonthPicker } from '@/components/month-picker'
import { SummaryCards } from '@/components/dashboard/summary-cards'
import { AccountTable } from '@/components/dashboard/account-table'
import { SharePie } from '@/components/dashboard/share-pie'
import { TrendLine } from '@/components/dashboard/trend-line'
import { getMonthlyData, getExpenseTrend } from '@/lib/queries/dashboard'
import { listAccounts } from '@/lib/queries/accounts'
import { calculateMonthlySummary } from '@/lib/calculations'
import { currentMonthParam, toMonthParam } from '@/lib/month'
import { formatRupiah } from '@/lib/format'
import type { Category } from '@/lib/types'

const CATEGORY_LABELS: Record<Category, string> = {
  expense: 'Pengeluaran',
  installment: 'Cicilan',
  saving: 'Tabungan',
  card_bill: 'Tagihan kartu kredit',
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  const { month: monthParam } = await searchParams
  const month = toMonthParam(monthParam ?? currentMonthParam())

  const [input, accounts, trend] = await Promise.all([
    getMonthlyData(month),
    listAccounts(),
    getExpenseTrend(month),
  ])
  const summary = calculateMonthlySummary(input)

  const names = Object.fromEntries(accounts.map((a) => [a.id, a.name]))
  const paid = summary.totalExpense - summary.unpaidTotal
  const paidRatio = summary.totalExpense > 0 ? paid / summary.totalExpense : 0

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <Suspense fallback={null}>
          <MonthPicker defaultMonth={month} />
        </Suspense>
      </div>

      <SummaryCards summary={summary} actualSalary={input.actualSalary} />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Progres pembayaran</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div
            className="bg-muted h-2 w-full overflow-hidden rounded-full"
            role="progressbar"
            aria-valuenow={Math.round(paidRatio * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-full rounded-full"
              style={{ width: `${paidRatio * 100}%`, background: 'var(--chart-1)' }}
            />
          </div>
          <p className="text-muted-foreground text-sm">
            {formatRupiah(paid)} dari {formatRupiah(summary.totalExpense)} sudah dibayar
            {' · '}
            sisa {formatRupiah(summary.unpaidTotal)}
          </p>
        </CardContent>
      </Card>

      <AccountTable perAccount={summary.perAccount} names={names} />

      <div className="grid gap-4 sm:grid-cols-2">
        <SharePie
          title="Per kategori"
          data={summary.perCategory.map((c) => ({
            name: CATEGORY_LABELS[c.category],
            value: c.total,
          }))}
        />
        <SharePie
          title="Per rekening"
          data={summary.perAccount.map((a) => ({
            name: names[a.accountId] ?? '—',
            value: a.need,
          }))}
        />
      </div>

      <TrendLine data={trend} />
    </div>
  )
}
