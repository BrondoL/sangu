'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'
import { restoreExcludedAction } from '@/app/(app)/current/actions'

export function ExcludedNote({
  periodId,
  month,
  count,
}: {
  periodId: string
  month: string
  count: number
}) {
  const [pending, startTransition] = useTransition()

  return (
    <p className="text-muted-foreground px-1 text-xs">
      {count} item dikecualikan bulan ini{' · '}
      <button
        type="button"
        disabled={pending}
        className="hover:text-foreground underline underline-offset-2 disabled:opacity-60"
        onClick={() =>
          startTransition(async () => {
            const result = await restoreExcludedAction(periodId, month)
            if (result && !result.ok) toast.error(result.message)
            // Not "items are back": a definition deactivated in the meantime
            // will not return, because sync only reads active ones.
            else toast.success('Pengecualian dibatalkan')
          })
        }
      >
        {pending ? 'Memulihkan…' : 'Pulihkan'}
      </button>
    </p>
  )
}
