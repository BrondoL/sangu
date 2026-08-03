'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatRupiah } from '@/lib/format'
import { formatMonthLabel } from '@/lib/month'

export function TrendLine({ data }: { data: { month: string; total: number }[] }) {
  const points = data.map((d) => ({
    label: formatMonthLabel(d.month).split(' ')[0].slice(0, 3),
    full: formatMonthLabel(d.month),
    total: d.total,
  }))

  return (
    <Card>
      <CardHeader>
        {/* Single series — the title names it, so no legend box is needed. */}
        <CardTitle className="text-base">Tren total pengeluaran</CardTitle>
      </CardHeader>
      <CardContent className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
            <CartesianGrid stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={{ stroke: 'var(--border)' }}
              tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
            />
            <YAxis
              width={64}
              tickLine={false}
              axisLine={false}
              tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
              tickFormatter={(v: number) => (v === 0 ? '0' : `${Math.round(v / 1_000_000)} jt`)}
            />
            <Tooltip
              cursor={{ stroke: 'var(--border)' }}
              labelFormatter={(_, payload) => payload?.[0]?.payload?.full ?? ''}
              formatter={(value) => [formatRupiah(Number(value)), 'Total']}
              contentStyle={{
                background: 'var(--popover)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                color: 'var(--popover-foreground)',
                fontSize: 12,
              }}
            />
            <Line
              type="monotone"
              dataKey="total"
              stroke="var(--chart-1)"
              strokeWidth={2}
              dot={{ r: 4, fill: 'var(--chart-1)', stroke: 'var(--card)', strokeWidth: 2 }}
              activeDot={{ r: 6 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
