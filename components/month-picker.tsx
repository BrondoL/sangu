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
    <div className="flex items-center justify-between gap-2">
      <Button
        variant="ghost"
        size="icon"
        aria-label="Bulan sebelumnya"
        onClick={() => go(-1)}
      >
        <ChevronLeft className="size-5" />
      </Button>
      <span className="text-base font-medium">{formatMonthLabel(month)}</span>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Bulan berikutnya"
        onClick={() => go(1)}
      >
        <ChevronRight className="size-5" />
      </Button>
    </div>
  )
}
