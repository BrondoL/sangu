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

  const sufficiencyVsBase = baseSalary - totalShortfall
  const sufficiencyVsActual =
    actualSalary === null ? null : actualSalary - totalShortfall

  const nonReceiverShortfall = perAccount
    .filter((a) => {
      const acc = accounts.find((x) => x.id === a.accountId)!
      return !acc.isSalaryReceiver
    })
    .reduce((s, a) => s + a.shortfall, 0)

  const freeMoney =
    sufficiencyVsActual === null ? null : Math.max(0, sufficiencyVsActual)

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
    !proxy || !receiver || freeMoney === null
      ? null
      : nonReceiverShortfall + freeMoney + receiverSurplus

  return {
    totalExpense,
    perAccount,
    totalShortfall,
    sufficiencyVsBase,
    sufficiencyVsActual,
    receiverSurplus,
    transferToProxy,
    unpaidTotal,
    perCategory,
    warnings,
  }
}
