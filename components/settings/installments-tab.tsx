import { Plus, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RupiahInput } from '@/components/rupiah-input'
import { FormDialog } from '@/components/form-dialog'
import { DeleteButton } from '@/components/delete-button'
import { AccountPicker, PaymentMethodPicker } from './pickers'
import { DefinitionList, DefinitionRow, DefinitionTotal } from './definition-list'
import {
  saveInstallmentAction,
  deleteInstallmentAction,
} from '@/app/(app)/settings/actions'
import { formatRupiah } from '@/lib/format'
import {
  formatMonthLabel,
  monthsBetween,
  shiftMonth,
  toMonthParam,
} from '@/lib/month'
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

  /** Which instalment of the tenor `currentMonth` is, clamped to the window. */
  const progressOf = (i: Installment) => {
    const elapsed = monthsBetween(i.start_month, currentMonth) + 1
    return {
      paidCount: Math.max(0, Math.min(i.tenor_months, elapsed)),
      notStarted: elapsed <= 0,
      finished: elapsed > i.tenor_months,
      lastMonth: formatMonthLabel(shiftMonth(i.start_month, i.tenor_months - 1)),
    }
  }

  // A finished instalment stops generating on its own, so it is no longer part
  // of this month's commitment even though the row stays in the register.
  const monthly = items
    .filter((i) => {
      const { notStarted, finished } = progressOf(i)
      return !notStarted && !finished
    })
    .reduce((sum, i) => sum + i.monthly_amount, 0)

  return (
    <DefinitionList
      title="Cicilan"
      description="Berhenti sendiri begitu tenornya habis. Nominalnya selalu dari sini, tidak pernah mewarisi bulan lalu."
      unit="dalam rupiah"
      isEmpty={items.length === 0}
      empty={
        accounts.length === 0
          ? 'Tambah rekening dulu — setiap cicilan harus menempel pada satu rekening.'
          : 'Belum ada cicilan.'
      }
      action={
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
      }
    >
      {items.map((item) => {
        const { paidCount, notStarted, finished, lastMonth } = progressOf(item)
        const ratio = paidCount / item.tenor_months
        return (
          <DefinitionRow
            key={item.id}
            name={item.name}
            inactive={finished}
            inactiveLabel="Lunas"
            meta={
              // Plain strings, not sibling elements: JSX drops the whitespace
              // between two elements on separate lines and glues "BCA" to "·".
              finished
                ? nameOf(item.account_id)
                : notStarted
                  ? `${nameOf(item.account_id)} · mulai ${formatMonthLabel(item.start_month)}`
                  : `${nameOf(item.account_id)} · bulan ke-${paidCount} dari ${item.tenor_months} · selesai ${lastMonth}`
            }
            right={
              <span className={finished ? 'amount text-muted-foreground text-sm' : 'amount text-sm'}>
                {item.monthly_amount.toLocaleString('id-ID')}
              </span>
            }
            below={
              // How far through the tenor you are is the one thing a list of
              // instalments should show at a glance — but only while one is
              // actually running. A full bar on a settled instalment and an
              // empty one on a future instalment both just read as a stray rule.
              !finished &&
              !notStarted && (
                <div
                  className="bg-muted mt-2 h-1 w-full overflow-hidden rounded-full"
                  role="progressbar"
                  aria-label={`Progres cicilan ${item.name}`}
                  aria-valuenow={paidCount}
                  aria-valuemin={0}
                  aria-valuemax={item.tenor_months}
                >
                  <div
                    className="bg-primary h-full"
                    style={{ width: `${ratio * 100}%` }}
                  />
                </div>
              )
            }
            actions={
              <>
                <FormDialog
                  title={`Ubah ${item.name}`}
                  action={saveInstallmentAction}
                  trigger={
                    <Button variant="ghost" size="icon-sm" aria-label={`Ubah ${item.name}`}>
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
              </>
            }
          />
        )
      })}
      <DefinitionTotal label="Jalan bulan ini">{formatRupiah(monthly)}</DefinitionTotal>
    </DefinitionList>
  )
}
