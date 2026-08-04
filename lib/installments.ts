import { monthsBetween, shiftMonth, toIsoMonth } from './month'

/**
 * Instalment arithmetic. Pure — nothing here touches the database or the clock;
 * the caller passes the month it cares about, exactly as `projectGoal` does.
 * Amounts are integer rupiah, and every figure below is a whole number of
 * payments times `monthlyAmount`, so nothing can turn into a float.
 *
 * The register in Pengaturan already says where each instalment is in its own
 * tenor. What it could not say is the aggregate: how much is still owed across
 * all of them, how much leaves the account this month, and when the last one is
 * settled. That is what `summarizeInstallments` is for.
 */

export interface InstallmentDefinition {
  monthlyAmount: number
  tenorMonths: number
  /** 'YYYY-MM-01' as the DB holds it, or 'YYYY-MM' — both parse the same. */
  startMonth: string
}

export type InstallmentProjectionInput = InstallmentDefinition & {
  currentMonth: string
}

export interface InstallmentProjection {
  /**
   * Which payment of the tenor `currentMonth` is, 1-based — the number the
   * register prints as "bulan ke-N dari T". Clamped to the tenor window: 0
   * before the instalment starts, and the tenor itself once it is over, so it
   * is always a legal `aria-valuenow` between 0 and `tenorMonths`.
   */
  paymentNumber: number
  notStarted: boolean
  finished: boolean
  /** ISO month ('YYYY-MM-01') of the final payment. Always known — the tenor fixes it. */
  lastPaymentMonth: string
  /**
   * What is still owed AFTER the payment for `currentMonth` has been made.
   *
   * This is the side of the boundary to be careful about, because the
   * difference is one whole payment. `monthsBetween(start, current) + 1` is the
   * project's convention for the payment number, so in the month an instalment
   * is on payment 3 of 12 this figure counts the 9 payments from next month
   * onwards — not 10. Consequences worth knowing:
   *
   * - An instalment in its final month has `remaining: 0` while it is still
   *   running and still costing money this month. It is not lunas yet.
   * - `remaining` and the month's own payment never overlap, so the whole debt
   *   still to leave the account, counting this month, is
   *   `totalRemaining + monthlyCommitment` — the two figures the summary shows
   *   side by side add up rather than double-counting.
   *
   * An instalment that has not started yet owes its whole tenor: no payment is
   * due in `currentMonth`, so there is none to subtract.
   */
  remaining: number
  /** 0–1, clamped by construction, ready to use as a progress-bar width. */
  progressRatio: number
}

export function projectInstallment(
  input: InstallmentProjectionInput
): InstallmentProjection {
  const { monthlyAmount, tenorMonths, startMonth, currentMonth } = input

  const elapsed = monthsBetween(startMonth, currentMonth) + 1
  const paymentNumber = Math.max(0, Math.min(tenorMonths, elapsed))

  return {
    paymentNumber,
    notStarted: elapsed <= 0,
    // The month of the last payment is still a running month, not a settled
    // one: the money leaves the account that month. Same boundary
    // `isInstallmentActive` in lib/generate.ts uses to decide whether an
    // instalment still generates an item, so the register and the generator
    // cannot disagree about which months an instalment is alive for.
    finished: elapsed > tenorMonths,
    lastPaymentMonth: toIsoMonth(shiftMonth(startMonth, tenorMonths - 1)),
    remaining: monthlyAmount * (tenorMonths - paymentNumber),
    // The DB constrains the tenor to be positive and the form asks for min 1;
    // the guard is here so a bad row can never put NaN into a style attribute.
    progressRatio: tenorMonths > 0 ? paymentNumber / tenorMonths : 1,
  }
}

export interface InstallmentsSummary {
  /**
   * Total still owed once this month's payments are made — the sum of every
   * instalment's `remaining`, so it sits on the same side of the boundary as
   * that field. Instalments that have not started yet are counted in full: the
   * commitment exists whether or not the first payment has come due.
   */
  totalRemaining: number
  /**
   * What leaves the account this month. Only instalments actually running in
   * `currentMonth` count — a finished one stops generating an item on its own,
   * and one that starts later has nothing due yet. 0 when none is running.
   */
  monthlyCommitment: number
  /**
   * The final payment of whichever instalment settles last, among those that
   * still have payments left. null when nothing is outstanding — including the
   * empty list, and a register where every instalment is already lunas. A
   * month is never invented for a debt that no longer exists.
   */
  lastPaymentMonth: string | null
  /** Instalments with payments still to come, whether running or not yet started. */
  outstandingCount: number
  /** Instalments running in `currentMonth`. */
  runningCount: number
}

export function summarizeInstallments(input: {
  installments: InstallmentDefinition[]
  currentMonth: string
}): InstallmentsSummary {
  const { installments, currentMonth } = input

  let totalRemaining = 0
  let monthlyCommitment = 0
  let lastPaymentMonth: string | null = null
  let outstandingCount = 0
  let runningCount = 0

  for (const i of installments) {
    const p = projectInstallment({ ...i, currentMonth })

    totalRemaining += p.remaining
    if (!p.finished && !p.notStarted) {
      monthlyCommitment += i.monthlyAmount
      runningCount += 1
    }
    if (!p.finished) {
      outstandingCount += 1
      // Latest wins. ISO months are zero-padded and fixed width, so comparing
      // them as strings is comparing them as months — no Date anywhere.
      // Counted even when `monthlyAmount` is 0: this answers when the last
      // instalment finishes, which is a question about the calendar, not money.
      if (lastPaymentMonth === null || p.lastPaymentMonth > lastPaymentMonth) {
        lastPaymentMonth = p.lastPaymentMonth
      }
    }
  }

  return {
    totalRemaining,
    monthlyCommitment,
    lastPaymentMonth,
    outstandingCount,
    runningCount,
  }
}
