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
      className={cn('text-right tabular-nums', className)}
    />
  )
}
