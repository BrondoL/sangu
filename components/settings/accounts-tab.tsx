import { Plus, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FormDialog } from '@/components/form-dialog'
import { DeleteButton } from '@/components/delete-button'
import { DefinitionList, DefinitionRow, Tag } from './definition-list'
import { saveAccountAction, deleteAccountAction } from '@/app/(app)/settings/actions'
import type { Tables } from '@/lib/database.types'

type Account = Tables<'accounts'>

function CheckField({
  name,
  label,
  defaultChecked,
}: {
  name: string
  label: string
  defaultChecked?: boolean
}) {
  return (
    <div className="flex items-center gap-2">
      <Checkbox id={name} name={name} defaultChecked={defaultChecked} />
      <Label htmlFor={name}>{label}</Label>
    </div>
  )
}

function AccountFields({ account }: { account?: Account }) {
  return (
    <>
      {account && <input type="hidden" name="id" value={account.id} />}
      <div className="space-y-1">
        <Label htmlFor="name">Nama rekening</Label>
        <Input id="name" name="name" defaultValue={account?.name} required />
      </div>
      <div className="space-y-1">
        <Label htmlFor="sort_order">Urutan</Label>
        <Input
          id="sort_order"
          name="sort_order"
          type="number"
          defaultValue={account?.sort_order ?? 0}
        />
      </div>
      <div className="space-y-2">
        <CheckField
          name="is_salary_receiver"
          label="Penerima gaji"
          defaultChecked={account?.is_salary_receiver}
        />
        <CheckField name="is_proxy" label="Rekening proxy" defaultChecked={account?.is_proxy} />
        <CheckField
          name="has_credit_card"
          label="Punya kartu kredit"
          defaultChecked={account?.has_credit_card}
        />
        <CheckField
          name="is_active"
          label="Aktif"
          defaultChecked={account?.is_active ?? true}
        />
      </div>
    </>
  )
}

export function AccountsTab({ accounts }: { accounts: Account[] }) {
  return (
    <DefinitionList
      title="Rekening"
      description="Penerima gaji dan proxy yang menentukan angka transfer di Dashboard."
      isEmpty={accounts.length === 0}
      empty="Belum ada rekening. Tambahkan satu dulu — semua definisi lain menempel padanya."
      action={
        <FormDialog
          title="Tambah rekening"
          action={saveAccountAction}
          trigger={
            <Button size="sm">
              <Plus className="size-4" /> Tambah
            </Button>
          }
        >
          <AccountFields />
        </FormDialog>
      }
    >
      {accounts.map((account) => (
        <DefinitionRow
          key={account.id}
          name={account.name}
          inactive={!account.is_active}
          meta={
            <>
              {account.is_salary_receiver && <Tag tone="accent">Penerima gaji</Tag>}
              {account.is_proxy && <Tag tone="accent">Proxy</Tag>}
              {account.has_credit_card && <Tag>Kartu kredit</Tag>}
              {!account.is_salary_receiver &&
                !account.is_proxy &&
                !account.has_credit_card && <span>Tanpa peran khusus</span>}
            </>
          }
          actions={
            <>
              <FormDialog
                title={`Ubah ${account.name}`}
                action={saveAccountAction}
                trigger={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Ubah ${account.name}`}
                  >
                    <Pencil className="size-4" />
                  </Button>
                }
              >
                <AccountFields account={account} />
              </FormDialog>
              <DeleteButton
                id={account.id}
                label={account.name}
                action={deleteAccountAction}
              />
            </>
          }
        />
      ))}
    </DefinitionList>
  )
}
