import { Card, CardContent } from '@/components/ui/card'
import { Eyebrow, SectionHead } from '@/components/kwitansi'
import type { AccountNeed } from '@/lib/types'
import type { Tables } from '@/lib/database.types'

type Account = Pick<Tables<'accounts'>, 'id' | 'name' | 'is_salary_receiver' | 'is_proxy'>

/** Digits only. The unit lives in the column header, the way a statement does it. */
function Figure({
  value,
  zero = '—',
  className,
}: {
  value: number
  zero?: string
  className?: string
}) {
  return (
    <td className={`amount py-2 pl-3 text-right ${className ?? ''}`}>
      {value === 0 ? <span className="text-muted-foreground">{zero}</span> : value.toLocaleString('id-ID')}
    </td>
  )
}

export function AccountTable({
  perAccount,
  accounts,
}: {
  perAccount: AccountNeed[]
  accounts: Account[]
}) {
  const rows = perAccount.filter((a) => a.need > 0 || a.balance > 0)
  const byId = new Map(accounts.map((a) => [a.id, a]))

  const totals = rows.reduce(
    (acc, r) => ({
      need: acc.need + r.need,
      balance: acc.balance + r.balance,
      shortfall: acc.shortfall + r.shortfall,
    }),
    { need: 0, balance: 0, shortfall: 0 }
  )

  return (
    <Card>
      <CardContent>
        <SectionHead title="Kebutuhan per rekening" aside="dalam rupiah" />

        {rows.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Belum ada kebutuhan tercatat untuk bulan ini.
          </p>
        ) : (
          <table className="w-full text-xs sm:text-sm">
            <thead>
              <tr className="border-border border-b">
                <th className="pb-2 text-left font-normal">
                  <Eyebrow>Rekening</Eyebrow>
                </th>
                <th className="pb-2 pl-3 text-right font-normal">
                  <Eyebrow>Butuh</Eyebrow>
                </th>
                <th className="pb-2 pl-3 text-right font-normal">
                  <Eyebrow>Saldo</Eyebrow>
                </th>
                <th className="pb-2 pl-3 text-right font-normal">
                  <Eyebrow>Kurang</Eyebrow>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const account = byId.get(row.accountId)
                // The role is why an account behaves differently in the transfer
                // maths, so it belongs next to the name rather than in a legend.
                const role = account?.is_salary_receiver
                  ? 'penerima gaji'
                  : account?.is_proxy
                    ? 'proxy'
                    : null
                return (
                  <tr key={row.accountId} className="border-border/60 border-b last:border-0">
                    <td className="py-2 pr-2">
                      <span className="block leading-tight">{account?.name ?? '—'}</span>
                      {role && (
                        <span className="eyebrow text-[0.625rem] tracking-[0.1em]">
                          {role}
                        </span>
                      )}
                    </td>
                    <Figure value={row.need} />
                    <Figure value={row.balance} />
                    <Figure
                      value={row.shortfall}
                      zero="cukup"
                      className={row.shortfall > 0 ? 'text-destructive' : ''}
                    />
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="border-rule border-t-2">
                <td className="pt-2.5">
                  <Eyebrow>Jumlah</Eyebrow>
                </td>
                <Figure value={totals.need} className="pt-2.5 font-medium" />
                <Figure value={totals.balance} className="pt-2.5 font-medium" />
                <Figure
                  value={totals.shortfall}
                  zero="cukup"
                  className={`pt-2.5 font-medium ${totals.shortfall > 0 ? 'text-destructive' : ''}`}
                />
              </tr>
            </tfoot>
          </table>
        )}
      </CardContent>
    </Card>
  )
}
