'use client'

import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Amount, Eyebrow } from '@/components/kwitansi'
import { Button } from '@/components/ui/button'

/**
 * The salary, hidden until asked for.
 *
 * It is the one figure on the page that says something about the person rather
 * than the month, and the dashboard gets opened in places where someone can see
 * the screen. Closed on every load rather than remembered — a preference that
 * persists would eventually be left open and forgotten, which defeats it.
 */
export function SalaryStat({
  value,
  hint,
}: {
  value: number | null
  hint?: string
}) {
  const [shown, setShown] = useState(false)

  return (
    <div className="border-rule px-4 py-3 not-last:border-b sm:not-last:border-r sm:not-last:border-b-0">
      <div className="flex items-start justify-between gap-2">
        <Eyebrow>Gaji aktual</Eyebrow>
        {/* Nothing to conceal when the month has no salary recorded yet. */}
        {value !== null && (
          <Button
            variant="ghost"
            size="icon-xs"
            className="-mt-1 -mr-1.5"
            onClick={() => setShown((s) => !s)}
            aria-pressed={shown}
            aria-label={shown ? 'Sembunyikan gaji aktual' : 'Tampilkan gaji aktual'}
          >
            {shown ? (
              <EyeOff className="size-3.5" aria-hidden />
            ) : (
              <Eye className="size-3.5" aria-hidden />
            )}
          </Button>
        )}
      </div>

      <div className="mt-1.5">
        <Amount value={value} size="lg" masked={!shown} />
      </div>

      {hint && <p className="text-muted-foreground mt-1 text-xs">{hint}</p>}
    </div>
  )
}
