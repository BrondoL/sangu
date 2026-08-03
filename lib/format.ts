export function formatRupiah(n: number): string {
  const sign = n < 0 ? '-' : ''
  const digits = Math.abs(Math.round(n)).toLocaleString('id-ID')
  return `${sign}Rp ${digits}`
}

export function parseRupiah(s: string): number {
  const digits = s.replace(/[^\d-]/g, '')
  if (digits === '' || digits === '-') return 0
  return parseInt(digits, 10)
}
