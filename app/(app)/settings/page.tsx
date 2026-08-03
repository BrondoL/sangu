import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/kwitansi'
import { AccountsTab } from '@/components/settings/accounts-tab'
import { RecurringTab } from '@/components/settings/recurring-tab'
import { InstallmentsTab } from '@/components/settings/installments-tab'
import { SavingsTab } from '@/components/settings/savings-tab'
import { BaseSalaryForm } from '@/components/settings/base-salary-form'
import { listAccounts } from '@/lib/queries/accounts'
import {
  listRecurring,
  listInstallments,
  listSavingsGoals,
  getSettings,
} from '@/lib/queries/definitions'
import { currentMonthParam } from '@/lib/month'
import { logout } from '@/app/auth/actions'

export default async function SettingsPage() {
  const [accounts, recurring, installments, savingsGoals, settings] =
    await Promise.all([
      listAccounts(),
      listRecurring(),
      listInstallments(),
      listSavingsGoals(),
      getSettings(),
    ])

  return (
    <div>
      <PageHeader
        title="Pengaturan"
        lead="Definisi yang jarang berubah. Bulan berjalan menyalin dari sini."
      >
        <form action={logout}>
          <Button type="submit" variant="outline" size="sm">
            Keluar
          </Button>
        </form>
      </PageHeader>

      <Tabs defaultValue="accounts">
        <TabsList className="w-full">
          <TabsTrigger value="accounts">Rekening</TabsTrigger>
          <TabsTrigger value="recurring">Rutin</TabsTrigger>
          <TabsTrigger value="installments">Cicilan</TabsTrigger>
          <TabsTrigger value="savings">Target</TabsTrigger>
          <TabsTrigger value="salary">Gaji</TabsTrigger>
        </TabsList>

        <TabsContent value="accounts" className="pt-4">
          <AccountsTab accounts={accounts} />
        </TabsContent>
        <TabsContent value="recurring" className="pt-4">
          <RecurringTab items={recurring} accounts={accounts} />
        </TabsContent>
        <TabsContent value="installments" className="pt-4">
          <InstallmentsTab
            items={installments}
            accounts={accounts}
            currentMonth={currentMonthParam()}
          />
        </TabsContent>
        <TabsContent value="savings" className="pt-4">
          <SavingsTab items={savingsGoals} accounts={accounts} />
        </TabsContent>
        <TabsContent value="salary" className="pt-4">
          <BaseSalaryForm baseSalary={settings.base_salary} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
