/**
 * Month helpers. A "month param" is 'YYYY-MM' (used in URLs); an "ISO month" is
 * 'YYYY-MM-01' (what the DB `date` columns hold). Both are plain strings — no
 * Date objects, so nothing here depends on the machine timezone.
 */

const MONTH_NAMES = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
]

function parts(month: string): [number, number] {
  const [y, m] = month.split('-').map(Number)
  return [y, m]
}

export function toMonthParam(month: string): string {
  const [y, m] = parts(month)
  return `${y}-${String(m).padStart(2, '0')}`
}

export function toIsoMonth(month: string): string {
  return `${toMonthParam(month)}-01`
}

export function shiftMonth(month: string, delta: number): string {
  const [y, m] = parts(month)
  const total = y * 12 + (m - 1) + delta
  const year = Math.floor(total / 12)
  const monthNo = (total % 12) + 1
  return `${year}-${String(monthNo).padStart(2, '0')}`
}

/** Whole months from `from` to `to`; negative when `to` is the earlier one. */
export function monthsBetween(from: string, to: string): number {
  const [fy, fm] = parts(from)
  const [ty, tm] = parts(to)
  return (ty * 12 + tm) - (fy * 12 + fm)
}

/**
 * The month "now" belongs to, in WIB — not the server's timezone, which on a
 * hosted deployment is usually UTC and would flip a day early.
 */
export function currentMonthParam(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(now)
  const year = parts.find((p) => p.type === 'year')!.value
  const month = parts.find((p) => p.type === 'month')!.value
  return `${year}-${month}`
}

export function formatMonthLabel(month: string): string {
  const [y, m] = parts(month)
  return `${MONTH_NAMES[m - 1]} ${y}`
}

/** Today's date as 'YYYY-MM-DD' in WIB, for the same reason as `currentMonthParam`. */
export function currentDateParam(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}
