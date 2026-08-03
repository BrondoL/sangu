import { Suspense } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { MonthPicker } from '@/components/month-picker'
import { Eyebrow, PageHeader } from '@/components/kwitansi'
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
  const paidPercent = Math.round(paidRatio * 100)

  return (
    <div className="space-y-4">
      <PageHeader title="Dashboard">
        <Suspense fallback={null}>
          <MonthPicker defaultMonth={month} />
        </Suspense>
      </PageHeader>

      <SummaryCards summary={summary} actualSalary={input.actualSalary} />

      <AccountTable perAccount={summary.perAccount} accounts={accounts} />

      <Card>
        <CardContent className="space-y-2.5">
          <div className="flex items-baseline justify-between gap-3">
            <Eyebrow>Progres pembayaran</Eyebrow>
            <span className="amount text-sm">{paidPercent}%</span>
          </div>
          <div
            className="bg-muted h-1.5 w-full overflow-hidden rounded-full"
            role="progressbar"
            aria-label="Progres pembayaran"
            aria-valuenow={paidPercent}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="bg-primary h-full rounded-full transition-[width] duration-500"
              style={{ width: `${paidRatio * 100}%` }}
            />
          </div>
          <p className="text-muted-foreground text-xs">
            {formatRupiah(paid)} dari {formatRupiah(summary.totalExpense)} sudah
            dibayar · sisa {formatRupiah(summary.unpaidTotal)}
          </p>
        </CardContent>
      </Card>

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
