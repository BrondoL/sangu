'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { formatRupiah, parseRupiah } from '@/lib/format'

/**
 * Masked money field. Shows "Rp 1.500.000" while submitting the raw integer
 * rupiah under `name`, so server actions never have to parse display text.
 */
export function RupiahInput({
  name,
  defaultValue = 0,
  id,
  required,
  onValueChange,
}: {
  name: string
  defaultValue?: number | null
  id?: string
  required?: boolean
  onValueChange?: (value: number) => void
}) {
  const [value, setValue] = useState<number>(defaultValue ?? 0)

  return (
    <>
      <Input
        id={id ?? name}
        inputMode="numeric"
        autoComplete="off"
        value={formatRupiah(value)}
        onChange={(e) => {
          const next = parseRupiah(e.target.value)
          setValue(next)
          onValueChange?.(next)
        }}
        onFocus={(e) => e.currentTarget.select()}
      />
      <input type="hidden" name={name} value={value} required={required} />
    </>
  )
}
