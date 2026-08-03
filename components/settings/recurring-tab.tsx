import { Plus, Pencil } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RupiahInput } from '@/components/rupiah-input'
import { FormDialog } from '@/components/form-dialog'
import { DeleteButton } from '@/components/delete-button'
import { AccountPicker, PaymentMethodPicker } from './pickers'
import {
  saveRecurringAction,
  deleteRecurringAction,
} from '@/app/(app)/settings/actions'
import { formatRupiah } from '@/lib/format'
import type { Tables } from '@/lib/database.types'

type Recurring = Tables<'recurring_expenses'>
type Account = Tables<'accounts'>

function RecurringFields({
  accounts,
  item,
}: {
  accounts: Account[]
  item?: Recurring
}) {
  return (
    <>
      {item && <input type="hidden" name="id" value={item.id} />}
      <div className="space-y-1">
        <Label htmlFor="name">Nama</Label>
        <Input id="name" name="name" defaultValue={item?.name} required />
      </div>
      <div className="space-y-1">
        <Label htmlFor="default_amount">Nominal default</Label>
        <RupiahInput name="default_amount" defaultValue={item?.default_amount} />
      </div>
      <AccountPicker accounts={accounts} defaultValue={item?.account_id} />
      <PaymentMethodPicker defaultValue={item?.payment_method} />
      <div className="flex items-center gap-2">
        <Checkbox id="is_active" name="is_active" defaultChecked={item?.is_active ?? true} />
        <Label htmlFor="is_active">Aktif</Label>
      </div>
    </>
  )
}

export function RecurringTab({
  items,
  accounts,
}: {
  items: Recurring[]
  accounts: Account[]
}) {
  const nameOf = (id: string) => accounts.find((a) => a.id === id)?.name ?? '—'

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <FormDialog
          title="Tambah expense rutin"
          action={saveRecurringAction}
          trigger={
            <Button size="sm" disabled={accounts.length === 0}>
              <Plus className="size-4" /> Tambah
            </Button>
          }
        >
          <RecurringFields accounts={accounts} />
        </FormDialog>
      </div>

      {items.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          {accounts.length === 0
            ? 'Tambah rekening dulu sebelum membuat expense rutin.'
            : 'Belum ada expense rutin.'}
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>Rekening</TableHead>
              <TableHead className="text-right">Nominal</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className={item.is_active ? '' : 'text-muted-foreground'}>
                  {item.name}
                  {!item.is_active && ' (nonaktif)'}
                </TableCell>
                <TableCell>{nameOf(item.account_id)}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatRupiah(item.default_amount)}
                </TableCell>
                <TableCell className="text-right">
                  <FormDialog
                    title={`Ubah ${item.name}`}
                    action={saveRecurringAction}
                    trigger={
                      <Button variant="ghost" size="icon" aria-label={`Ubah ${item.name}`}>
                        <Pencil className="size-4" />
                      </Button>
                    }
                  >
                    <RecurringFields accounts={accounts} item={item} />
                  </FormDialog>
                  <DeleteButton
                    id={item.id}
                    label={item.name}
                    action={deleteRecurringAction}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
