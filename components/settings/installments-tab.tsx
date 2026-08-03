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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RupiahInput } from '@/components/rupiah-input'
import { FormDialog } from './form-dialog'
import { DeleteButton } from './delete-button'
import { AccountPicker, PaymentMethodPicker } from './pickers'
import {
  saveInstallmentAction,
  deleteInstallmentAction,
} from '@/app/(app)/settings/actions'
import { formatRupiah } from '@/lib/format'
import { formatMonthLabel, shiftMonth, toMonthParam } from '@/lib/month'
import type { Tables } from '@/lib/database.types'

type Installment = Tables<'installments'>
type Account = Tables<'accounts'>

function InstallmentFields({
  accounts,
  item,
  currentMonth,
}: {
  accounts: Account[]
  item?: Installment
  currentMonth: string
}) {
  return (
    <>
      {item && <input type="hidden" name="id" value={item.id} />}
      <div className="space-y-1">
        <Label htmlFor="name">Nama</Label>
        <Input id="name" name="name" defaultValue={item?.name} required />
      </div>
      <div className="space-y-1">
        <Label htmlFor="monthly_amount">Cicilan per bulan</Label>
        <RupiahInput name="monthly_amount" defaultValue={item?.monthly_amount} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="tenor_months">Tenor (bulan)</Label>
          <Input
            id="tenor_months"
            name="tenor_months"
            type="number"
            min={1}
            defaultValue={item?.tenor_months ?? 12}
            required
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="start_month">Mulai</Label>
          <Input
            id="start_month"
            name="start_month"
            type="month"
            defaultValue={toMonthParam(item?.start_month ?? currentMonth)}
            required
          />
        </div>
      </div>
      <AccountPicker accounts={accounts} defaultValue={item?.account_id} />
      <PaymentMethodPicker defaultValue={item?.payment_method} />
    </>
  )
}

export function InstallmentsTab({
  items,
  accounts,
  currentMonth,
}: {
  items: Installment[]
  accounts: Account[]
  currentMonth: string
}) {
  const nameOf = (id: string) => accounts.find((a) => a.id === id)?.name ?? '—'
  const lastMonth = (i: Installment) =>
    formatMonthLabel(shiftMonth(i.start_month, i.tenor_months - 1))

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <FormDialog
          title="Tambah cicilan"
          action={saveInstallmentAction}
          trigger={
            <Button size="sm" disabled={accounts.length === 0}>
              <Plus className="size-4" /> Tambah
            </Button>
          }
        >
          <InstallmentFields accounts={accounts} currentMonth={currentMonth} />
        </FormDialog>
      </div>

      {items.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          {accounts.length === 0
            ? 'Tambah rekening dulu sebelum membuat cicilan.'
            : 'Belum ada cicilan.'}
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>Rekening</TableHead>
              <TableHead>Selesai</TableHead>
              <TableHead className="text-right">Per bulan</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.name}</TableCell>
                <TableCell>{nameOf(item.account_id)}</TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {lastMonth(item)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {formatRupiah(item.monthly_amount)}
                </TableCell>
                <TableCell className="text-right">
                  <FormDialog
                    title={`Ubah ${item.name}`}
                    action={saveInstallmentAction}
                    trigger={
                      <Button variant="ghost" size="icon" aria-label={`Ubah ${item.name}`}>
                        <Pencil className="size-4" />
                      </Button>
                    }
                  >
                    <InstallmentFields
                      accounts={accounts}
                      item={item}
                      currentMonth={currentMonth}
                    />
                  </FormDialog>
                  <DeleteButton
                    id={item.id}
                    label={item.name}
                    action={deleteInstallmentAction}
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
