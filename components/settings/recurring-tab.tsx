import { Plus, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RupiahInput } from '@/components/rupiah-input'
import { FormDialog } from '@/components/form-dialog'
import { DeleteButton } from '@/components/delete-button'
import { AccountPicker, PaymentMethodPicker } from './pickers'
import { DefinitionList, DefinitionRow, DefinitionTotal } from './definition-list'
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
  // Only active rows are copied into a new month, so only they belong in the
  // figure that answers "what do I owe every month".
  const monthly = items
    .filter((i) => i.is_active)
    .reduce((sum, i) => sum + i.default_amount, 0)

  return (
    <DefinitionList
      title="Pengeluaran rutin"
      description="Disalin ke tiap bulan baru. Nominalnya mengikuti bulan lalu kalau ada."
      unit="dalam rupiah"
      isEmpty={items.length === 0}
      empty={
        accounts.length === 0
          ? 'Tambah rekening dulu — setiap pengeluaran rutin harus menempel pada satu rekening.'
          : 'Belum ada pengeluaran rutin. Listrik, internet, langganan — apa pun yang datang tiap bulan.'
      }
      action={
        <FormDialog
          title="Tambah pengeluaran rutin"
          action={saveRecurringAction}
          trigger={
            <Button size="sm" disabled={accounts.length === 0}>
              <Plus className="size-4" /> Tambah
            </Button>
          }
        >
          <RecurringFields accounts={accounts} />
        </FormDialog>
      }
    >
      {items.map((item) => (
        <DefinitionRow
          key={item.id}
          name={item.name}
          inactive={!item.is_active}
          meta={
            <>
              {nameOf(item.account_id)}
              {item.payment_method === 'credit' && ' · kartu kredit'}
            </>
          }
          right={
            <span className="amount text-sm">
              {item.default_amount.toLocaleString('id-ID')}
            </span>
          }
          actions={
            <>
              <FormDialog
                title={`Ubah ${item.name}`}
                action={saveRecurringAction}
                trigger={
                  <Button variant="ghost" size="icon-sm" aria-label={`Ubah ${item.name}`}>
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
            </>
          }
        />
      ))}
      <DefinitionTotal label="Jumlah per bulan">{formatRupiah(monthly)}</DefinitionTotal>
    </DefinitionList>
  )
}
