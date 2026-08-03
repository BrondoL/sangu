import { formatRupiah } from '@/lib/format'
import { cn } from '@/lib/utils'

/**
 * The shared vocabulary of the "kwitansi" direction. Every page is a printed
 * financial document: tracked-out mono labels, amounts on a right-hand rail,
 * hairline rules that separate rather than decorate.
 *
 * These are render-only, like every other component here — no math.
 */

export function Eyebrow({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return <span className={cn('eyebrow', className)}>{children}</span>
}

/** The title block every page opens with, so the four pages sit flush. */
export function PageHeader({
  title,
  lead,
  children,
}: {
  title: string
  lead?: React.ReactNode
  children?: React.ReactNode
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
      <div>
        <h1 className="text-[1.75rem] leading-none font-semibold tracking-[-0.02em]">
          {title}
        </h1>
        {lead && <p className="text-muted-foreground mt-1.5 text-sm">{lead}</p>}
      </div>
      {children}
    </div>
  )
}

/** A section title over a rule. The rule runs the full width of the rail. */
export function SectionHead({
  title,
  aside,
  className,
}: {
  title: string
  aside?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('border-rule mb-3 border-b pb-2', className)}>
      <div className="flex items-baseline justify-between gap-3">
        <Eyebrow>{title}</Eyebrow>
        {aside && <span className="text-muted-foreground text-xs">{aside}</span>}
      </div>
    </div>
  )
}

type Tone = 'default' | 'muted' | 'surplus' | 'deficit'

const TONE: Record<Tone, string> = {
  default: '',
  muted: 'text-muted-foreground',
  surplus: 'text-surplus',
  deficit: 'text-destructive',
}

const SIZE = {
  // Sized so a ten-digit figure still clears a 360px phone without wrapping.
  hero: 'text-[2.1rem] leading-[1.05] font-medium sm:text-5xl',
  lg: 'text-2xl font-medium',
  md: 'text-base',
  sm: 'text-sm',
} as const

/**
 * A rupiah figure. The "Rp" is set smaller and quieter than the digits: on a
 * page where every line starts with it, it is a unit mark, not information.
 */
export function Amount({
  value,
  size = 'md',
  tone = 'default',
  masked = false,
  className,
}: {
  value: number | null
  size?: keyof typeof SIZE
  tone?: Tone
  /** Stand in for the figure without hinting at its magnitude. */
  masked?: boolean
  className?: string
}) {
  if (masked && value !== null) {
    return (
      <span
        className={cn(
          'amount text-muted-foreground select-none',
          SIZE[size],
          className
        )}
        // A fixed run of dots: one per digit would leak the order of magnitude,
        // which is most of what the figure gives away.
        aria-label="Nominal disembunyikan"
      >
        <span className="mr-[0.35em] align-baseline text-[0.62em] opacity-55">
          Rp
        </span>
        ••••••
      </span>
    )
  }

  if (value === null) {
    return (
      <span className={cn('amount text-muted-foreground', SIZE[size], className)}>
        —
      </span>
    )
  }

  // formatRupiah yields "Rp 1.234" or "-Rp 1.234"; split the mark off the digits.
  const [mark, digits] = formatRupiah(value).split(' ')

  return (
    <span className={cn('amount', SIZE[size], TONE[tone], className)}>
      <span className="mr-[0.35em] align-baseline text-[0.62em] opacity-55">
        {mark}
      </span>
      {digits}
    </span>
  )
}

/** One line of the reckoning: what it is on the left, what it costs on the right. */
export function MoneyRow({
  label,
  value,
  hint,
  tone = 'default',
  strong = false,
  className,
}: {
  label: React.ReactNode
  value: number | null
  hint?: React.ReactNode
  tone?: Tone
  strong?: boolean
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex items-baseline justify-between gap-4 py-1.5',
        strong && 'border-rule mt-1 border-t pt-2.5',
        className
      )}
    >
      <span className="min-w-0">
        <span className={cn('text-sm', strong ? 'font-medium' : '')}>{label}</span>
        {hint && (
          <span className="text-muted-foreground block text-xs">{hint}</span>
        )}
      </span>
      <Amount value={value} size="sm" tone={tone} className={strong ? 'font-medium' : ''} />
    </div>
  )
}
