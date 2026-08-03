/**
 * Indonesian number-to-words, the "Terbilang:" line every kwitansi, cheque and
 * bank slip carries. Here it does the same job it does on paper: eight-digit
 * rupiah figures are easy to misread by an order of magnitude, and the words
 * are the check against that.
 *
 * Pure and DB-free, like the rest of `lib/`.
 */

const UNITS = [
  '',
  'satu',
  'dua',
  'tiga',
  'empat',
  'lima',
  'enam',
  'tujuh',
  'delapan',
  'sembilan',
  'sepuluh',
  'sebelas',
]

/**
 * The `se-` prefix (sepuluh, sebelas, seratus, seribu) replaces "satu" — but
 * only below a million. "Sejuta" is colloquial; a slip says "satu juta".
 */
function spell(n: number): string {
  if (n < 12) return UNITS[n]
  if (n < 20) return `${spell(n - 10)} belas`
  if (n < 100) {
    const rest = n % 10
    return `${spell(Math.floor(n / 10))} puluh${rest ? ` ${spell(rest)}` : ''}`
  }
  if (n < 200) {
    const rest = n % 100
    return `seratus${rest ? ` ${spell(rest)}` : ''}`
  }
  if (n < 1_000) {
    const rest = n % 100
    return `${spell(Math.floor(n / 100))} ratus${rest ? ` ${spell(rest)}` : ''}`
  }
  if (n < 2_000) {
    const rest = n % 1_000
    return `seribu${rest ? ` ${spell(rest)}` : ''}`
  }
  for (const [size, name] of [
    [1_000_000_000_000, 'triliun'],
    [1_000_000_000, 'miliar'],
    [1_000_000, 'juta'],
    [1_000, 'ribu'],
  ] as const) {
    if (n >= size) {
      const rest = n % size
      return `${spell(Math.floor(n / size))} ${name}${rest ? ` ${spell(rest)}` : ''}`
    }
  }
  return UNITS[n]
}

export function terbilang(amount: number): string {
  // Amounts are whole rupiah everywhere else; round rather than spell cents.
  const n = Math.round(amount)
  if (n === 0) return 'nol'
  if (n < 0) return `minus ${spell(-n)}`
  return spell(n)
}

/** The full slip line: sentence-cased and carrying the currency. */
export function terbilangRupiah(amount: number): string {
  const words = terbilang(amount)
  return `${words.charAt(0).toUpperCase()}${words.slice(1)} rupiah`
}
