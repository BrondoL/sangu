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
  transferToProxy: number | null     // null if no actualSalary or no proxy
  unpaidTotal: number
  perCategory: CategoryTotal[]
  warnings: CalcWarning[]
}
