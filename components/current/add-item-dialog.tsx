import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RupiahInput } from '@/components/rupiah-input'
import { FormDialog } from '@/components/form-dialog'
import { AccountPicker, PaymentMethodPicker } from '@/components/settings/pickers'
import { addItemAction } from '@/app/(app)/current/actions'
import type { Tables } from '@/lib/database.types'

export function AddItemDialog({
  periodId,
  accounts,
}: {
  periodId: string
  accounts: Tables<'accounts'>[]
}) {
  return (
    <FormDialog
      title="Tambah pengeluaran"
      action={addItemAction}
      trigger={
        <Button size="sm" variant="outline">
          <Plus className="size-4" /> Tambah pengeluaran
        </Button>
      }
    >
      <input type="hidden" name="period_id" value={periodId} />
      {/* Manual rows are always plain expenses — the other categories come from
          definitions, so letting them be hand-added would break generation. */}
      <input type="hidden" name="category" value="expense" />
      <div className="space-y-1">
        <Label htmlFor="name">Nama</Label>
        <Input id="name" name="name" required />
      </div>
      <div className="space-y-1">
        <Label htmlFor="amount">Nominal</Label>
        <RupiahInput name="amount" />
      </div>
      <AccountPicker accounts={accounts} />
      <PaymentMethodPicker />
    </FormDialog>
  )
}
