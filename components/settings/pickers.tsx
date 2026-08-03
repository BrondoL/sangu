import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import type { Tables } from '@/lib/database.types'

export function AccountPicker({
  accounts,
  defaultValue,
}: {
  accounts: Tables<'accounts'>[]
  defaultValue?: string
}) {
  return (
    <div className="space-y-1">
      <Label htmlFor="account_id">Rekening</Label>
      <Select name="account_id" defaultValue={defaultValue ?? accounts[0]?.id} required>
        <SelectTrigger id="account_id" className="w-full">
          <SelectValue placeholder="Pilih rekening" />
        </SelectTrigger>
        <SelectContent>
          {accounts.map((a) => (
            <SelectItem key={a.id} value={a.id}>
              {a.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

export function PaymentMethodPicker({ defaultValue }: { defaultValue?: string }) {
  return (
    <div className="space-y-1">
      <Label htmlFor="payment_method">Metode bayar</Label>
      <Select name="payment_method" defaultValue={defaultValue ?? 'debit'}>
        <SelectTrigger id="payment_method" className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="debit">Debit</SelectItem>
          <SelectItem value="credit">Kartu kredit</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
