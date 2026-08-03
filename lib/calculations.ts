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

  const receiverRow = receiver
    ? perAccount.find((a) => a.accountId === receiver.id)
    : undefined

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
  const receiverSurplus = receiver
    ? Math.max(0, balanceOf(receiver.id) - (receiverRow?.need ?? 0))
    : 0

  /**
   * Everything the receiver can spare: the salary that just landed, less the
   * part it must hold back for its own expenses, plus whatever it was already
   * carrying beyond them.
   *
   * Stated as what the receiver *has* rather than as what the proxy *needs*,
   * because those diverge in a deficit month and only the first is an
   * instruction that can actually be carried out. Adding up the far side —
   * shortfalls plus leftover salary plus the surplus — gives the same answer
   * whenever the salary covers everything, but in a deficit it asks for money
   * that does not exist, and it double-counts the surplus, which funds the
   * shortfall rather than adding to it.
   *
   * Needs both flags: without a proxy there is nowhere to send it, and without
   * a receiver there is nothing to send it from.
   */
  const transferToProxy =
    !proxy || !receiver || actualSalary === null
      ? null
      : Math.max(0, actualSalary - (receiverRow?.shortfall ?? 0) + receiverSurplus)

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
