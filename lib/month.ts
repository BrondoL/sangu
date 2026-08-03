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

export function formatMonthLabel(month: string): string {
  const [y, m] = parts(month)
  return `${MONTH_NAMES[m - 1]} ${y}`
}
