import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PageHeader } from '@/components/kwitansi'
import { SubmitButton } from '@/components/submit-button'
import { AccountsTab } from '@/components/settings/accounts-tab'
import { RecurringTab } from '@/components/settings/recurring-tab'
import { InstallmentsTab } from '@/components/settings/installments-tab'
import { SavingsTab } from '@/components/settings/savings-tab'
import { BaseSalaryForm } from '@/components/settings/base-salary-form'
import { TrackedTab } from '@/components/settings/tracked-tab'
import { listAccounts } from '@/lib/queries/accounts'
import {
  listRecurring,
  listInstallments,
  listSavingsGoals,
  getSettings,
} from '@/lib/queries/definitions'
import { listAllRecurringWithTracking } from '@/lib/queries/spending'
import { currentMonthParam } from '@/lib/month'
import { logout } from '@/app/auth/actions'
import { toggleTrackedAction } from './actions'

function Count({ n }: { n: number }) {
  return (
    <span className="amount text-muted-foreground ml-1 text-[0.7rem]">{n}</span>
  )
}

/**
 * Six registers do not fit across a phone. The labels are set nowrap, so as
 * flex-1 they refuse to shrink and drag the whole page into a sideways scroll;
 * sized to their own text inside a scrolling strip, only the strip moves. From
 * sm up the six do fit, so they go back to sharing the width evenly.
 */
function Tab({ value, children }: { value: string; children: React.ReactNode }) {
  return (
    <TabsTrigger value={value} className="flex-none sm:flex-1">
      {children}
    </TabsTrigger>
  )
}

export default async function SettingsPage() {
  const [accounts, recurring, installments, savingsGoals, settings, trackable] =
    await Promise.all([
      listAccounts(),
      listRecurring(),
      listInstallments(),
      listSavingsGoals(),
      getSettings(),
      listAllRecurringWithTracking(),
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
        {/* justify-start so the strip fills from the left once it overflows —
            centred content would hide the first tab as readily as the last.
            The scrollbar is suppressed because the tab clipped at the right
            edge is the affordance, and a bar drawn inside a 32px strip sits on
            top of the labels. */}
        <TabsList className="w-full justify-start overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {/* The count is the cheapest way to see which registers are still
              empty without opening each one. */}
          <Tab value="accounts">
            Rekening <Count n={accounts.length} />
          </Tab>
          <Tab value="recurring">
            Rutin <Count n={recurring.length} />
          </Tab>
          <Tab value="installments">
            Cicilan <Count n={installments.length} />
          </Tab>
          <Tab value="savings">
            Target <Count n={savingsGoals.length} />
          </Tab>
          <Tab value="salary">Gaji</Tab>
          <Tab value="tracked">
            Dilacak <Count n={trackable.filter((r) => r.tracked).length} />
          </Tab>
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
        <TabsContent value="tracked" className="pt-4">
          <TrackedTab rows={trackable} action={toggleTrackedAction} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
