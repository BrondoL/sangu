'use client'

import { useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Eyebrow } from '@/components/kwitansi'
import { TAK_TERDUGA } from '@/lib/pos'

/**
 * The two fields the capture form and the edit dialog share. They were written
 * out twice, which is how the two drifted: the select was a hand-rolled `h-9`
 * while every `Input` in the app is `h-8`, so the fields beside each other in
 * one row sat at different heights.
 */

/**
 * The pos a row is filed under, built from `components/ui/select` like every
 * other picker in the app — see `components/settings/pickers.tsx`, whose shape
 * this matches prop for prop.
 *
 * It was a hand-styled native `<select>` because "Tak terduga" was the empty
 * string and a Radix `SelectItem` may not carry `value=""`. `TAK_TERDUGA` is
 * that value given a name, so the option is an ordinary one and the actions
 * turn it back into null on the way in.
 *
 * Radix is not a native control: it posts through a hidden `<select>` it
 * renders itself, and only when the Root is given a `name`. Without that name
 * the form submits nothing for the pos and every entry silently becomes tak
 * terduga — which is why `fields.test.tsx` submits the form and reads the
 * FormData rather than trusting the markup.
 */
export function PosField({
  id,
  budgets,
  defaultValue = TAK_TERDUGA,
}: {
  id: string
  budgets: { id: string; name: string }[]
  defaultValue?: string
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>Pos</Label>
      <Select name="recurring_expense_id" defaultValue={defaultValue}>
        <SelectTrigger id={id} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={TAK_TERDUGA}>Tak terduga</SelectItem>
          {budgets.map((b) => (
            <SelectItem key={b.id} value={b.id}>
              {b.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

/**
 * More than this and the form grows a wall of chips on a phone. The notes that
 * repeat are a handful — "Laundry", "Bensin" — not a catalogue, and the list
 * arrives newest first, so the cut falls on the ones least likely to be typed
 * again today.
 */
const MAX_SUGGESTIONS = 6

/**
 * The note, with the recent ones under it as buttons.
 *
 * This was a `<datalist>`, which is unstyleable, opens on a different gesture
 * in every browser, and on a phone — where this app is actually used — often
 * does not open at all. It looked like a select and did nothing. Visible,
 * tappable buttons are the whole of the fix.
 *
 * The field stays free text: a suggestion is a shortcut, never the only way in.
 * With no saved notes the row is not rendered at all — an empty strip under the
 * field would be a promise of something that is not there yet.
 */
export function NoteField({
  id,
  notes,
  defaultValue,
}: {
  id: string
  notes: string[]
  defaultValue?: string
}) {
  const ref = useRef<HTMLInputElement>(null)
  const recent = notes.slice(0, MAX_SUGGESTIONS)

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>Catatan</Label>
      <Input
        id={id}
        name="note"
        defaultValue={defaultValue}
        autoComplete="off"
        ref={ref}
      />
      {recent.length > 0 && (
        // `type="button"`, so a tap fills the field instead of submitting the
        // form. Uncontrolled, like the field itself: writing the value straight
        // onto the input is what keeps `form.reset()` able to clear it after an
        // entry is recorded.
        <div
          role="group"
          aria-label="Catatan terakhir"
          className="flex flex-wrap items-center gap-1.5 pt-0.5"
        >
          <Eyebrow>Terakhir</Eyebrow>
          {recent.map((note) => (
            <button
              key={note}
              type="button"
              onClick={() => {
                const el = ref.current
                if (!el) return
                el.value = note
                el.focus()
              }}
              className="border-input hover:bg-accent hover:text-accent-foreground focus-visible:border-ring focus-visible:ring-ring/50 max-w-full truncate rounded-md border px-2.5 py-1.5 text-xs transition-colors outline-none focus-visible:ring-3"
            >
              {note}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
