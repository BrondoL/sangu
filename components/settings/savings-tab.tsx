import { Plus, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RupiahInput } from '@/components/rupiah-input'
import { FormDialog } from '@/components/form-dialog'
import { DeleteButton } from '@/components/delete-button'
import { AccountPicker } from './pickers'
import { DefinitionList, DefinitionRow, DefinitionTotal, Tag } from './definition-list'
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
  const monthly = items
    .filter((i) => i.is_active)
    .reduce((sum, i) => sum + i.monthly_amount, 0)

  return (
    <DefinitionList
      title="Target tabungan"
      description="Setoran bulanannya ikut tergenerate. Progresnya dilacak di halaman Target."
      unit="setoran per bulan, dalam rupiah"
      isEmpty={items.length === 0}
      empty={
        accounts.length === 0
          ? 'Tambah rekening dulu — setiap target butuh rekening tujuan.'
          : 'Belum ada target tabungan.'
      }
      action={
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
      }
    >
      {items.map((item) => (
        <DefinitionRow
          key={item.id}
          name={item.name}
          inactive={!item.is_active}
          meta={
            item.target_amount === null ? (
              <>
                <Tag tone="quiet">Tanpa target nominal</Tag>
                {nameOf(item.account_id)}
              </>
            ) : (
              `${nameOf(item.account_id)} · target ${formatRupiah(item.target_amount)}`
            )
          }
          right={
            <span className="amount text-sm">
              {item.monthly_amount.toLocaleString('id-ID')}
            </span>
          }
          actions={
            <>
              <FormDialog
                title={`Ubah ${item.name}`}
                action={saveSavingsGoalAction}
                trigger={
                  <Button variant="ghost" size="icon-sm" aria-label={`Ubah ${item.name}`}>
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
            </>
          }
        />
      ))}
      <DefinitionTotal label="Jumlah per bulan">{formatRupiah(monthly)}</DefinitionTotal>
    </DefinitionList>
  )
}
