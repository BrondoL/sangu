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
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FormDialog } from '@/components/form-dialog'
import { DeleteButton } from '@/components/delete-button'
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
    <div className="space-y-4">
      <div className="flex justify-end">
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
      </div>

      {accounts.length === 0 ? (
        <p className="text-muted-foreground text-sm">Belum ada rekening.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Rekening</TableHead>
              <TableHead>Peran</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {accounts.map((account) => (
              <TableRow key={account.id}>
                <TableCell className={account.is_active ? '' : 'text-muted-foreground'}>
                  {account.name}
                  {!account.is_active && ' (nonaktif)'}
                </TableCell>
                <TableCell className="space-x-1">
                  {account.is_salary_receiver && <Badge variant="secondary">Gaji</Badge>}
                  {account.is_proxy && <Badge variant="secondary">Proxy</Badge>}
                  {account.has_credit_card && <Badge variant="outline">CC</Badge>}
                </TableCell>
                <TableCell className="text-right">
                  <FormDialog
                    title={`Ubah ${account.name}`}
                    action={saveAccountAction}
                    trigger={
                      <Button variant="ghost" size="icon" aria-label={`Ubah ${account.name}`}>
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
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}
