import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatRupiah } from '@/lib/format'
import type { AccountNeed } from '@/lib/types'

export function AccountTable({
  perAccount,
  names,
}: {
  perAccount: AccountNeed[]
  names: Record<string, string>
}) {
  const rows = perAccount.filter((a) => a.need > 0 || a.balance > 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Kebutuhan per rekening</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-muted-foreground text-sm">Belum ada data.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rekening</TableHead>
                <TableHead className="text-right">Kebutuhan</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
                <TableHead className="text-right">Kekurangan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.accountId}>
                  <TableCell>{names[row.accountId] ?? '—'}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatRupiah(row.need)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatRupiah(row.balance)}
                  </TableCell>
                  <TableCell
                    className={
                      row.shortfall > 0
                        ? 'text-destructive text-right tabular-nums'
                        : 'text-muted-foreground text-right tabular-nums'
                    }
                  >
                    {formatRupiah(row.shortfall)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}
