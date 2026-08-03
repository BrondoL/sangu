'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { formatRupiah, parseRupiah } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { ActionState } from '@/lib/types'

/**
 * Money field that saves on blur. Reverts to the server value if the save
 * fails, so what you see always matches what is stored.
 */
export function InlineRupiah({
  value,
  save,
  label,
  className,
}: {
  value: number
  save: (amount: number) => Promise<ActionState>
  label: string
  className?: string
}) {
  const [amount, setAmount] = useState(value)
  const [pending, startTransition] = useTransition()

  const commit = () => {
    if (amount === value) return
    startTransition(async () => {
      const result = await save(amount)
      if (result && !result.ok) {
        toast.error(result.message)
        setAmount(value)
      }
    })
  }

  return (
    <Input
      aria-label={label}
      inputMode="numeric"
      autoComplete="off"
      disabled={pending}
      value={formatRupiah(amount)}
      onChange={(e) => setAmount(parseRupiah(e.target.value))}
      onFocus={(e) => e.currentTarget.select()}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur()
      }}
      // A ruled line to write the figure on, not a boxed field — a column of
      // outlined boxes drowns out the amounts themselves. The focus ring is
      // left intact so keyboard users still get an unmistakable target.
      className={cn(
        'amount h-8 rounded-none border-0 border-b bg-transparent px-1 text-right text-sm',
        'hover:bg-muted/50 focus-visible:border-ring dark:bg-transparent',
        className
      )}
    />
  )
}
