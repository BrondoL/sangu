import { Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RupiahInput } from '@/components/rupiah-input'
import { FormDialog } from '@/components/form-dialog'
import { NoteField, PosField } from '@/components/spending/fields'
import { formatRupiah } from '@/lib/format'
import { toPosValue } from '@/lib/pos'
import type { ActionState } from '@/lib/types'

/** The part of a spending row this dialog can change, plus its id. */
export type SpendingEntry = {
  id: string
  amount: number
  occurred_on: string
  recurring_expense_id: string | null
  note: string | null
}

/**
 * The four fields the capture form has, filled in from the row.
 *
 * `budgets` is the list of options this row may be filed under, built by the
 * page: the tracked budgets, plus the row's own pos when that is no longer
 * among them. A row filed against an untracked or retired budget reads as
 * "Tak terduga" in the list, and preselecting that here would refile it to
 * nothing the moment the amount was corrected — a silent second edit nobody
 * asked for.
 *
 * The ids are per row because every row on the page carries one of these, and
 * the capture form at the top already owns `#amount`, `#occurred_on` and the
 * rest: a duplicated id sends the label's click to the wrong field.
 */
export function SpendingFields({
  entry,
  budgets,
  notes,
}: {
  entry: SpendingEntry
  budgets: { id: string; name: string }[]
  notes: string[]
}) {
  const uid = `edit-${entry.id}`

  return (
    <>
      <input type="hidden" name="id" value={entry.id} />

      <div className="space-y-1.5">
        <Label htmlFor={`${uid}-amount`}>Nominal</Label>
        {/* Its amount lives in React state, so it takes its value from
            `defaultValue` once, at mount. FormDialog remounts these fields on
            every open, which is what keeps that value the row's own. */}
        <RupiahInput
          id={`${uid}-amount`}
          name="amount"
          defaultValue={entry.amount}
          required
        />
      </div>

      <PosField
        id={`${uid}-pos`}
        budgets={budgets}
        defaultValue={toPosValue(entry.recurring_expense_id)}
      />

      <div className="space-y-1.5">
        <Label htmlFor={`${uid}-date`}>Tanggal</Label>
        <Input
          type="date"
          id={`${uid}-date`}
          name="occurred_on"
          defaultValue={entry.occurred_on}
          required
        />
        {/* Said out loud because the page cannot follow the row: the month
            picker stays where it is, so a date moved out of the month on
            screen takes the entry off this list. It is not lost, and the
            figures of both months follow it. */}
        <p className="text-muted-foreground text-xs">
          Kalau tanggalnya dipindah ke bulan lain, catatan ini ikut pindah dan
          hilang dari daftar bulan yang sedang dibuka.
        </p>
      </div>

      <NoteField
        id={`${uid}-note`}
        notes={notes}
        defaultValue={entry.note ?? ''}
      />
    </>
  )
}

/**
 * Correcting a row already recorded. The pair to the delete button beside it:
 * a mistyped amount used to be fixable only by deleting the row and retyping
 * it, and until it was fixed the wrong figure counted — including in the
 * months Riwayat reads when it offers to raise the real budget.
 */
export function EditDialog({
  entry,
  budgets,
  notes,
  description,
  action,
}: {
  entry: SpendingEntry
  budgets: { id: string; name: string }[]
  notes: string[]
  /**
   * What identifies this entry among the month's rows — its date, its pos, its
   * note — the same line the delete dialog names it by. Several rows in a
   * month can carry the same amount, so the amount alone does not say which
   * pencil this is.
   */
  description: string
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>
}) {
  return (
    <FormDialog
      title={`Ubah ${formatRupiah(entry.amount)}`}
      action={action}
      trigger={
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Ubah ${formatRupiah(entry.amount)}, ${description}`}
        >
          <Pencil className="size-4" />
        </Button>
      }
    >
      <SpendingFields entry={entry} budgets={budgets} notes={notes} />
    </FormDialog>
  )
}
