'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { RupiahInput } from '@/components/rupiah-input'
import { SubmitButton } from '@/components/submit-button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import type { ActionState } from '@/lib/types'

export function CaptureForm({
  budgets,
  notes,
  defaultDate,
  action,
}: {
  budgets: { id: string; name: string }[]
  notes: string[]
  /** Today when the current month is open, otherwise the 1st of the month shown. */
  defaultDate: string
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>
}) {
  const [state, formAction] = useActionState(action, null)
  const formRef = useRef<HTMLFormElement>(null)

  // RupiahInput keeps its amount in React state, which a native form.reset()
  // cannot touch. Bumping this key remounts it, which is how FormDialog clears
  // the same component elsewhere in this codebase. Bumped during render, using
  // React's documented "storing information from previous renders" pattern
  // (state compared against state, no refs), since this repo's lint config
  // forbids both a setState call inside an effect body and a ref read/write
  // during render.
  const [entryKey, setEntryKey] = useState(0)
  const [handledState, setHandledState] = useState(state)
  if (state !== handledState) {
    setHandledState(state)
    if (state?.ok) setEntryKey((n) => n + 1)
  }

  // Clearing on success keeps the form ready for the next entry — this is a
  // thing done several times a day, so it must not need a reload between.
  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset()
      toast.success('Tercatat')
    } else if (state && !state.ok) {
      toast.error(state.message)
    }
  }, [state])

  return (
    <Card>
      <CardContent>
        <form ref={formRef} action={formAction} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <div className="space-y-1.5">
            <Label htmlFor="amount">Nominal</Label>
            <RupiahInput key={entryKey} name="amount" id="amount" required />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="recurring_expense_id">Pos</Label>
            <select
              id="recurring_expense_id"
              name="recurring_expense_id"
              className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
              defaultValue=""
            >
              <option value="">Tak terduga</option>
              {budgets.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="occurred_on">Tanggal</Label>
            <Input
              type="date"
              id="occurred_on"
              name="occurred_on"
              defaultValue={defaultDate}
              required
            />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="note">Catatan</Label>
            <Input id="note" name="note" list="spending-notes" autoComplete="off" />
            <datalist id="spending-notes">
              {notes.map((n) => (
                <option key={n} value={n} />
              ))}
            </datalist>
          </div>

          <div className="flex items-end">
            <SubmitButton pendingLabel="Menyimpan…">Catat</SubmitButton>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
