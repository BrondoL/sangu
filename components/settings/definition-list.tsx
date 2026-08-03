import { Card, CardContent } from '@/components/ui/card'
import { Eyebrow } from '@/components/kwitansi'
import { cn } from '@/lib/utils'

/**
 * The shell every definition list wears. Settings is the master register at the
 * back of the ledger: each list says what it is, what it feeds, and carries its
 * own "add" control in the header rather than letting one float above the page.
 */
export function DefinitionList({
  title,
  description,
  unit,
  action,
  isEmpty,
  empty,
  children,
}: {
  title: string
  description: string
  /** Shown beside the column heads when the figures share one unit. */
  unit?: string
  action: React.ReactNode
  isEmpty: boolean
  empty: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="border-rule flex items-start justify-between gap-4 border-b pb-3">
          <div className="min-w-0">
            <Eyebrow>{title}</Eyebrow>
            <p className="text-muted-foreground mt-1.5 text-sm text-pretty">
              {description}
            </p>
          </div>
          <div className="shrink-0">{action}</div>
        </div>

        {isEmpty ? (
          <p className="text-muted-foreground py-4 text-center text-sm text-balance">
            {empty}
          </p>
        ) : (
          <div>
            {unit && (
              <p className="text-muted-foreground -mt-1 mb-1 text-right text-xs">
                {unit}
              </p>
            )}
            <div className="divide-border/60 -my-1 divide-y">{children}</div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * One entry in a register: what it is and where it draws from on the left, the
 * figure on the money rail, then the controls. Same shape in all four lists.
 */
export function DefinitionRow({
  name,
  meta,
  inactive = false,
  inactiveLabel = 'Nonaktif',
  right,
  below,
  actions,
}: {
  name: string
  meta?: React.ReactNode
  inactive?: boolean
  /** Why the row is dimmed. An instalment is "Lunas", not "Nonaktif". */
  inactiveLabel?: string
  right?: React.ReactNode
  below?: React.ReactNode
  actions: React.ReactNode
}) {
  return (
    <div className="py-2.5">
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              'truncate text-sm leading-tight',
              inactive && 'text-muted-foreground'
            )}
          >
            {name}
          </p>
          {/* Flows as ordinary text rather than a flex row: the line mixes
              inline tags with phrases joined by "·", and in a flex container
              every text run becomes its own item, so the gap lands on top of
              the spaces already in the copy. It wraps instead of truncating —
              clipping mid-phrase drops a whole fact rather than shortening it. */}
          {(meta || inactive) && (
            <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
              {inactive && <Tag tone="quiet">{inactiveLabel}</Tag>}
              {meta}
            </p>
          )}
        </div>
        {right && <div className="shrink-0 text-right">{right}</div>}
        {/* -mr pulls the ghost buttons' padding back to the card edge. */}
        <div className="-mr-1.5 flex shrink-0 items-center">{actions}</div>
      </div>
      {below}
    </div>
  )
}

/** A role or state marker. Reads as a stamp on the register, not a button. */
export function Tag({
  children,
  tone = 'default',
}: {
  children: React.ReactNode
  tone?: 'default' | 'accent' | 'quiet'
}) {
  return (
    <span
      className={cn(
        'eyebrow mr-1.5 inline-block rounded px-1.5 py-0.5 align-middle text-[0.625rem] tracking-[0.1em]',
        tone === 'accent' && 'bg-primary/12 text-primary',
        tone === 'default' && 'bg-muted text-muted-foreground',
        tone === 'quiet' && 'border-border text-muted-foreground border'
      )}
    >
      {children}
    </span>
  )
}

/** Closes a register the way the dashboard table does — a rule and a total. */
export function DefinitionTotal({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="border-rule mt-1 flex items-baseline justify-between gap-4 border-t pt-2.5">
      <Eyebrow>{label}</Eyebrow>
      <span className="amount text-sm font-medium">{children}</span>
    </div>
  )
}
