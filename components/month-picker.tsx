'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatMonthLabel, shiftMonth, toMonthParam } from '@/lib/month'

/**
 * `defaultMonth` comes from the server so the first paint matches the data the
 * page loaded; the URL takes over once the user navigates.
 */
export function MonthPicker({ defaultMonth }: { defaultMonth: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const month = toMonthParam(searchParams.get('month') ?? defaultMonth)

  const go = (delta: number) => {
    const params = new URLSearchParams(searchParams)
    params.set('month', shiftMonth(month, delta))
    router.push(`${pathname}?${params}`)
  }

  return (
    <div className="border-border bg-card inline-flex items-center gap-0.5 rounded-lg border p-0.5">
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Bulan sebelumnya"
        onClick={() => go(-1)}
      >
        <ChevronLeft className="size-4" />
      </Button>
      <span className="min-w-[8.75rem] text-center font-mono text-[0.8rem] font-medium tracking-[0.06em] uppercase">
        {formatMonthLabel(month)}
      </span>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Bulan berikutnya"
        onClick={() => go(1)}
      >
        <ChevronRight className="size-4" />
      </Button>
    </div>
  )
}
