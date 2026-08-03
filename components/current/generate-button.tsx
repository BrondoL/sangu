'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { generateMonthAction } from '@/app/(app)/current/actions'

export function GenerateButton({
  month,
  label = 'Mulai bulan baru',
  variant = 'default',
}: {
  month: string
  label?: string
  variant?: 'default' | 'outline'
}) {
  const [pending, startTransition] = useTransition()

  return (
    <Button
      variant={variant}
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await generateMonthAction(month)
          if (result && !result.ok) toast.error(result.message)
          else toast.success('Bulan diperbarui dari definisi')
        })
      }
    >
      {pending ? 'Memproses…' : label}
    </Button>
  )
}
