import { Plus, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Amount, MoneyRow, SectionHead } from '@/components/kwitansi'
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
import { formatMonthLabel, toMonthParam } from '@/lib/month'
import {
  projectInstallment,
  summarizeInstallments,
  type InstallmentDefinition,
} from '@/lib/installments'
import type { Tables } from '@/lib/database.types'

type Installment = Tables<'installments'>
type Account = Tables<'accounts'>

/** The row as `lib/installments.ts` wants it: renaming only, no arithmetic. */
function defOf(i: Installment): InstallmentDefinition {
  return {
    monthlyAmount: i.monthly_amount,
    tenorMonths: i.tenor_months,
    startMonth: i.start_month,
  }
}

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

  // Every figure below comes out of lib/installments.ts: nothing on this page
  // is arithmetic done in a component.
  const summary = summarizeInstallments({
    installments: items.map(defOf),
    currentMonth,
  })

  return (
    <div className="space-y-4">
      {items.length > 0 && (
        <Card>
          <CardContent>
            {/* A section title in this app is an eyebrow over a rule, which is
                what SectionHead draws. This card was carrying a bare eyebrow
                and no rule, so it read as the one card that had been set by a
                different hand. */}
            <SectionHead title="Sisa utang cicilan" />
            {summary.lastPaymentMonth === null ? (
              // Every instalment in the register is settled. A column of Rp 0
              // would read as a bug rather than as good news, so it says so.
              <p className="text-muted-foreground text-sm">
                Semua cicilan sudah lunas. Tidak ada yang tersisa.
              </p>
            ) : (
              <>
                <Amount value={summary.totalRemaining} size="lg" />
                <p className="text-muted-foreground mt-1 text-xs text-pretty">
                  Setelah cicilan bulan ini dibayar. Termasuk yang belum mulai.
                </p>
                <div className="border-rule mt-3 border-t pt-1.5">
                  <MoneyRow
                    label="Jalan bulan ini"
                    value={summary.monthlyCommitment}
                  />
                  <div className="flex items-baseline justify-between gap-4 py-1.5">
                    <span className="text-sm">Lunas semua</span>
                    <span className="amount text-sm">
                      {formatMonthLabel(summary.lastPaymentMonth)}
                    </span>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

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
          const { paymentNumber, notStarted, finished, lastPaymentMonth, progressRatio } =
            projectInstallment({ ...defOf(item), currentMonth })
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
                    : `${nameOf(item.account_id)} · bulan ke-${paymentNumber} dari ${item.tenor_months} · selesai ${formatMonthLabel(lastPaymentMonth)}`
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
                    aria-valuenow={paymentNumber}
                    aria-valuemin={0}
                    aria-valuemax={item.tenor_months}
                  >
                    <div
                      className="bg-primary h-full"
                      style={{ width: `${progressRatio * 100}%` }}
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
        <DefinitionTotal label="Jalan bulan ini">
          {formatRupiah(summary.monthlyCommitment)}
        </DefinitionTotal>
      </DefinitionList>
    </div>
  )
}
