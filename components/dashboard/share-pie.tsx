'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { Card, CardContent } from '@/components/ui/card'
import { SectionHead } from '@/components/kwitansi'
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
        <CardContent>
          <SectionHead title={title} />
          <p className="text-muted-foreground text-sm">Belum ada data.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent>
        <SectionHead title={title} />
        {/* Side by side only once the card is genuinely wide. In the two-column
            grid below lg each card is ~330px, and a donut beside a three-column
            legend there squeezes the names down to an initial. */}
        <div className="flex flex-col items-center gap-5 lg:flex-row">
          <div className="size-36 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={slices}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={36}
                  outerRadius={68}
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

          {/* The legend doubles as the direct labels: identity is never colour-alone.
              min-w-0 + flex-1, never w-full: beside a shrink-0 donut in a flex
              row, w-full resolves to the whole row and pushes the figures out
              past the card's clipped edge. */}
          <ul className="min-w-0 flex-1 space-y-2 text-sm">
            {slices.map((slice, index) => (
              <li key={slice.name} className="flex items-center gap-2.5">
                <span
                  aria-hidden
                  className="size-2.5 shrink-0 rounded-[2px]"
                  style={{ background: SLOTS[index % SLOTS.length] }}
                />
                <span className="flex-1 truncate">{slice.name}</span>
                <span className="amount text-[0.8rem]">
                  {slice.value.toLocaleString('id-ID')}
                </span>
                <span className="amount text-muted-foreground w-10 text-right text-xs">
                  {Math.round((slice.value / total) * 100)}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
