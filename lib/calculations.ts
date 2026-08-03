import type {
  MonthlyCalcInput,
  MonthlySummary,
  AccountNeed,
  CalcWarning,
  Category,
  CategoryTotal,
} from './types'

const CATEGORIES: Category[] = ['expense', 'installment', 'saving', 'card_bill']

export function calculateMonthlySummary(input: MonthlyCalcInput): MonthlySummary {
  const { accounts, items, balances, actualSalary, baseSalary } = input

  const balanceOf = (id: string) =>
    balances.find((b) => b.accountId === id)?.balance ?? 0

  // Need per account = sum of item amounts, ignoring payment method.
  const perAccount: AccountNeed[] = accounts.map((acc) => {
    const need = items
      .filter((i) => i.accountId === acc.id)
      .reduce((sum, i) => sum + i.amount, 0)
    const balance = balanceOf(acc.id)
    const shortfall = Math.max(0, need - balance)
    return { accountId: acc.id, need, balance, shortfall }
  })

  const totalExpense = items.reduce((sum, i) => sum + i.amount, 0)
  const totalShortfall = perAccount.reduce((s, a) => s + a.shortfall, 0)
  const unpaidTotal = items
    .filter((i) => !i.isPaid)
    .reduce((sum, i) => sum + i.amount, 0)

  const perCategory: CategoryTotal[] = CATEGORIES.map((category) => ({
    category,
    total: items
      .filter((i) => i.category === category)
      .reduce((sum, i) => sum + i.amount, 0),
  }))

  const warnings: CalcWarning[] = []
  const proxy = accounts.find((a) => a.isProxy)
  const receiver = accounts.find((a) => a.isSalaryReceiver)
  if (!proxy) warnings.push('no_proxy')
  if (!receiver) warnings.push('no_salary_receiver')

  // Against the raw shortfall — used only to size the salary's own leftover
  // before the receiver's spare cash is added on top of the transfer.
  const salaryLeftover =
    actualSalary === null ? null : actualSalary - totalShortfall

  const nonReceiverShortfall = perAccount
    .filter((a) => {
      const acc = accounts.find((x) => x.id === a.accountId)!
      return !acc.isSalaryReceiver
    })
    .reduce((s, a) => s + a.shortfall, 0)

  const salaryFree =
    salaryLeftover === null ? null : Math.max(0, salaryLeftover)

  /**
   * What the salary receiver is already holding beyond its own expenses.
   *
   * Shortfall is clamped at zero, so an over-funded receiver is invisible to
   * the rest of the maths — and the excess would sit idle while free money from
   * the same month collects in the proxy. The receiver is the one account a
   * transfer is leaving anyway, so sweeping it costs no extra action. That is
   * what separates it from any other account in surplus, whose balance stays
   * put precisely because moving it would be an unplanned transfer.
   */
  const receiverNeed = receiver
    ? (perAccount.find((a) => a.accountId === receiver.id)?.need ?? 0)
    : 0
  const receiverSurplus = receiver
    ? Math.max(0, balanceOf(receiver.id) - receiverNeed)
    : 0

  // Needs both flags: without a proxy there is nowhere to send the money, and
  // without a receiver "non-receiver shortfall" would just be every shortfall.
  const transferToProxy =
    !proxy || !receiver || salaryFree === null
      ? null
      : nonReceiverShortfall + salaryFree + receiverSurplus

  /**
   * What the month actually costs once the money already sitting in the
   * receiver is counted, and what is left over after covering it.
   *
   * `freeMoney` is the figure to act on: it is exactly what the proxy is still
   * holding once it has topped up every account that was short, so it is the
   * amount available to move into savings.
   */
  const netShortfall = totalShortfall - receiverSurplus
  const freeMoneyVsBase = baseSalary - netShortfall
  const freeMoney = actualSalary === null ? null : actualSalary - netShortfall

  return {
    totalExpense,
    perAccount,
    totalShortfall,
    receiverSurplus,
    netShortfall,
    freeMoneyVsBase,
    freeMoney,
    transferToProxy,
    unpaidTotal,
    perCategory,
    warnings,
  }
}
