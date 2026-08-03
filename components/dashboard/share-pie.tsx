'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatRupiah } from '@/lib/format'

export type Share = { name: string; value: number }

/** Fixed slot order — a slice keeps its hue no matter how many slices survive. */
const SLOTS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
]

export function SharePie({ title, data }: { title: string; data: Share[] }) {
  // Zero slices carry no information and would still consume a hue slot.
  const slices = data.filter((d) => d.value > 0)
  const total = slices.reduce((sum, d) => sum + d.value, 0)

  if (slices.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">Belum ada data.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4 sm:flex-row">
        <div className="h-40 w-40 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={slices}
                dataKey="value"
                nameKey="name"
                innerRadius={38}
                outerRadius={70}
                // 2px surface gap so adjacent fills never touch.
                stroke="var(--card)"
                strokeWidth={2}
                isAnimationActive={false}
              >
                {slices.map((slice, index) => (
                  <Cell key={slice.name} fill={SLOTS[index % SLOTS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => formatRupiah(Number(value))}
                contentStyle={{
                  background: 'var(--popover)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  color: 'var(--popover-foreground)',
                  fontSize: 12,
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Legend doubles as the direct labels: identity is never colour-alone. */}
        <ul className="w-full space-y-1.5 text-sm">
          {slices.map((slice, index) => (
            <li key={slice.name} className="flex items-center gap-2">
              <span
                aria-hidden
                className="size-2.5 shrink-0 rounded-[2px]"
                style={{ background: SLOTS[index % SLOTS.length] }}
              />
              <span className="flex-1 truncate">{slice.name}</span>
              <span className="tabular-nums">{formatRupiah(slice.value)}</span>
              <span className="text-muted-foreground w-10 text-right tabular-nums">
                {Math.round((slice.value / total) * 100)}%
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
