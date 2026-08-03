import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PageHeader } from '@/components/kwitansi'
import { SubmitButton } from '@/components/submit-button'
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

function Count({ n }: { n: number }) {
  return (
    <span className="amount text-muted-foreground ml-1 text-[0.7rem]">{n}</span>
  )
}

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
          <SubmitButton variant="outline" size="sm" pendingLabel="Keluar…">
            Keluar
          </SubmitButton>
        </form>
      </PageHeader>

      <Tabs defaultValue="accounts">
        <TabsList className="w-full">
          {/* The count is the cheapest way to see which registers are still
              empty without opening each one. */}
          <TabsTrigger value="accounts">
            Rekening <Count n={accounts.length} />
          </TabsTrigger>
          <TabsTrigger value="recurring">
            Rutin <Count n={recurring.length} />
          </TabsTrigger>
          <TabsTrigger value="installments">
            Cicilan <Count n={installments.length} />
          </TabsTrigger>
          <TabsTrigger value="savings">
            Target <Count n={savingsGoals.length} />
          </TabsTrigger>
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
