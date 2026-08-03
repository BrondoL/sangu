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
import { AccountPicker } from './pickers'
import {
  saveSavingsGoalAction,
  deleteSavingsGoalAction,
} from '@/app/(app)/settings/actions'
import { formatRupiah } from '@/lib/format'
import type { Tables } from '@/lib/database.types'

type Goal = Tables<'savings_goals'>
type Account = Tables<'accounts'>

function GoalFields({ accounts, item }: { accounts: Account[]; item?: Goal }) {
  return (
    <>
      {item && <input type="hidden" name="id" value={item.id} />}
      <div className="space-y-1">
        <Label htmlFor="name">Nama target</Label>
        <Input id="name" name="name" defaultValue={item?.name} required />
      </div>
      <div className="space-y-1">
        <Label htmlFor="monthly_amount">Setoran per bulan</Label>
        <RupiahInput name="monthly_amount" defaultValue={item?.monthly_amount} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="target_amount">Target nominal (opsional)</Label>
        <RupiahInput name="target_amount" defaultValue={item?.target_amount} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="target_date">Target tanggal (opsional)</Label>
        <Input
          id="target_date"
          name="target_date"
          type="date"
          defaultValue={item?.target_date ?? ''}
        />
      </div>
      <AccountPicker accounts={accounts} defaultValue={item?.account_id} />
      <div className="flex items-center gap-2">
        <Checkbox id="is_active" name="is_active" defaultChecked={item?.is_active ?? true} />
        <Label htmlFor="is_active">Aktif</Label>
      </div>
    </>
  )
}

export function SavingsTab({
  items,
  accounts,
}: {
  items: Goal[]
  accounts: Account[]
}) {
  const nameOf = (id: string) => accounts.find((a) => a.id === id)?.name ?? '—'

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <FormDialog
          title="Tambah target"
          action={saveSavingsGoalAction}
          trigger={
            <Button size="sm" disabled={accounts.length === 0}>
              <Plus className="size-4" /> Tambah
            </Button>
          }
        >
          <GoalFields accounts={accounts} />
        </FormDialog>
      </div>

      {items.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          {accounts.length === 0
            ? 'Tambah rekening dulu sebelum membuat target.'
            : 'Belum ada target tabungan.'}
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Target</TableHead>
              <TableHead>Rekening</TableHead>
              <TableHead className="text-right">Per bulan</TableHead>
              <TableHead className="text-right">Target</TableHead>
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
                  {formatRupiah(item.monthly_amount)}
                </TableCell>
                <TableCell className="text-right tabular-nums">
                  {item.target_amount === null ? '—' : formatRupiah(item.target_amount)}
                </TableCell>
                <TableCell className="text-right">
                  <FormDialog
                    title={`Ubah ${item.name}`}
                    action={saveSavingsGoalAction}
                    trigger={
                      <Button variant="ghost" size="icon" aria-label={`Ubah ${item.name}`}>
                        <Pencil className="size-4" />
                      </Button>
                    }
                  >
                    <GoalFields accounts={accounts} item={item} />
                  </FormDialog>
                  <DeleteButton
                    id={item.id}
                    label={item.name}
                    action={deleteSavingsGoalAction}
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
