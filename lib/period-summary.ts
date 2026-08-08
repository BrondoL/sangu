export interface PeriodContents {
  itemCount: number
  paidCount: number
  balanceCount: number
  hasActualSalary: boolean
  hasNote: boolean
}

/**
 * What a month is holding, in one line, for the dialog that offers to delete
 * it. Empty parts are not written: a month with no note says nothing about
 * notes, so the sentence never pads itself with things that are not there.
 */
export function describePeriodContents(contents: PeriodContents): string {
  const { itemCount, paidCount, balanceCount, hasActualSalary, hasNote } =
    contents
  const parts: string[] = []

  if (itemCount > 0) {
    parts.push(
      paidCount > 0 ? `${itemCount} item, ${paidCount} lunas` : `${itemCount} item`
    )
  }
  if (hasActualSalary) parts.push('gaji riil terisi')
  if (balanceCount > 0) parts.push(`saldo ${balanceCount} rekening`)
  if (hasNote) parts.push('ada catatan')

  return parts.length === 0 ? 'bulan ini masih kosong' : parts.join(' · ')
}
