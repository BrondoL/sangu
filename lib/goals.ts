import { shiftMonth, toIsoMonth } from './month'

export interface GoalProjectionInput {
  targetAmount: number | null
  accumulated: number
  monthlyAmount: number
  currentMonth: string // 'YYYY-MM-01'
  targetDate: string | null
}

export interface GoalProjection {
  remaining: number | null
  monthsLeft: number | null
  completionMonth: string | null
  onTrack: boolean | null
  progressRatio: number | null
}

/**
 * Projects a savings goal forward at its current monthly rate. Pure — no dates
 * are read from the clock, the caller passes the month it cares about.
 *
 * A goal with no target amount is open-ended: it can be accumulated but never
 * "finished", so everything downstream of the target is null.
 */
export function projectGoal(input: GoalProjectionInput): GoalProjection {
  const { targetAmount, accumulated, monthlyAmount, currentMonth, targetDate } =
    input

  if (targetAmount === null) {
    return {
      remaining: null,
      monthsLeft: null,
      completionMonth: null,
      onTrack: null,
      progressRatio: null,
    }
  }

  const remaining = Math.max(0, targetAmount - accumulated)
  const progressRatio =
    targetAmount > 0 ? Math.min(1, accumulated / targetAmount) : 1

  // Nothing is being set aside each month, so there is no arrival date.
  if (monthlyAmount <= 0) {
    return {
      remaining,
      monthsLeft: null,
      completionMonth: null,
      onTrack: null,
      progressRatio,
    }
  }

  const monthsLeft = Math.ceil(remaining / monthlyAmount)
  const completionMonth = toIsoMonth(shiftMonth(currentMonth, monthsLeft))
  const onTrack = targetDate ? completionMonth <= targetDate : null

  return { remaining, monthsLeft, completionMonth, onTrack, progressRatio }
}
