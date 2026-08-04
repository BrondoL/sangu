'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { RupiahInput } from '@/components/rupiah-input'
import { SubmitButton } from '@/components/submit-button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { SectionHead } from '@/components/kwitansi'
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
        <SectionHead title="Catat pengeluaran" />

        {/*
          Four fields in one grid, the action on a row of its own. The button
          used to be a fourth grid cell pushed down with `items-end`, which
          cannot line up with a field that carries a label above it at any
          width, and on a phone gave it a column to itself.

          Nominal and Tanggal take the first row because they are the two that
          get typed on every entry; Pos and Catatan follow, so what grows under
          Catatan grows downwards rather than pushing a neighbour out of line.
        */}
        <form ref={formRef} action={formAction} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="amount">Nominal</Label>
              <RupiahInput key={entryKey} name="amount" id="amount" required />
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

            <div className="space-y-1.5">
              <Label htmlFor="recurring_expense_id">Pos</Label>
              {/* Set to the same rule as Input — it was `h-9` against every
                  other field's `h-8`, so the two fields sharing a row sat at
                  different heights before the button was ever reached. */}
              <select
                id="recurring_expense_id"
                name="recurring_expense_id"
                className="border-input focus-visible:border-ring focus-visible:ring-ring/50 dark:bg-input/30 h-8 w-full rounded-lg border bg-transparent px-2 text-base transition-colors outline-none focus-visible:ring-3 md:text-sm"
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
              <Label htmlFor="note">Catatan</Label>
              <Input id="note" name="note" list="spending-notes" autoComplete="off" />
              <datalist id="spending-notes">
                {notes.map((n) => (
                  <option key={n} value={n} />
                ))}
              </datalist>
            </div>
          </div>

          {/* Full width on a phone, where it is a thumb target; right-aligned
              on wider screens. The rule above it is the one every other card
              here closes with, so it reads as the foot of the form rather than
              as a button left floating beside a field. */}
          <div className="border-rule flex border-t pt-3">
            <SubmitButton className="w-full sm:ml-auto sm:w-auto" pendingLabel="Menyimpan…">
              Catat
            </SubmitButton>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
