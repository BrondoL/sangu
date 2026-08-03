/** Result of a form server action, consumed by `useActionState`. */
export type ActionState = { ok: true } | { ok: false; message: string } | null

export type Category = 'expense' | 'installment' | 'saving' | 'card_bill'
export type PaymentMethod = 'debit' | 'credit'
export type SourceType = 'recurring' | 'installment' | 'saving'

export interface CalcAccount {
  id: string
  name: string
  isSalaryReceiver: boolean
  isProxy: boolean
}

export interface CalcItem {
  accountId: string
  amount: number
  category: Category
  isPaid: boolean
}

export interface CalcBalance {
  accountId: string
  balance: number
}

export interface MonthlyCalcInput {
  accounts: CalcAccount[]
  items: CalcItem[]
  balances: CalcBalance[]
  actualSalary: number | null
  baseSalary: number
}

export interface AccountNeed {
  accountId: string
  need: number
  balance: number
  shortfall: number
}

export interface CategoryTotal {
  category: Category
  total: number
}

export type CalcWarning = 'no_proxy' | 'no_salary_receiver'

export interface MonthlySummary {
  totalExpense: number
  perAccount: AccountNeed[]
  totalShortfall: number
  sufficiencyVsBase: number          // baseSalary - totalShortfall
  sufficiencyVsActual: number | null // actualSalary - totalShortfall (null if no actualSalary)
  receiverSurplus: number            // what the salary receiver holds beyond its own need
  transferToProxy: number | null     // null if no actualSalary, proxy, or receiver
  unpaidTotal: number
  perCategory: CategoryTotal[]
  warnings: CalcWarning[]
}

export interface RecurringDef {
  id: string
  name: string
  defaultAmount: number
  accountId: string
  paymentMethod: PaymentMethod
}

export interface InstallmentDef {
  id: string
  name: string
  monthlyAmount: number
  tenorMonths: number
  startMonth: string // 'YYYY-MM-01'
  accountId: string
  paymentMethod: PaymentMethod
}

export interface SavingDef {
  id: string
  name: string
  monthlyAmount: number
  accountId: string
}

export interface PreviousItem {
  sourceType: SourceType | null
  sourceId: string | null
  amount: number
}

export interface GenerateInput {
  targetMonth: string // 'YYYY-MM-01'
  recurringExpenses: RecurringDef[]
  installments: InstallmentDef[]
  savingsGoals: SavingDef[]
  creditCardAccountIds: string[]
  previousItems: PreviousItem[] | null
  existingSourceIds: Set<string>       // recurring/installment/saving already in target month
  existingCardBillAccountIds: Set<string>
}

export interface PlannedItem {
  name: string
  amount: number
  accountId: string
  category: Category
  paymentMethod: PaymentMethod
  sourceType: SourceType | null
  sourceId: string | null
}
