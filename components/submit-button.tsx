'use client'

import { useFormStatus } from 'react-dom'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * A submit button that reports the server action it belongs to.
 *
 * `useFormStatus` only sees the form when it is read from a component *inside*
 * that form, which is why this is its own component rather than a prop on the
 * page.
 *
 * The label changes as well as the spinner: the reduced-motion rule in
 * globals.css stops the animation, and a frozen spinner with no other signal
 * would be worse than none at all.
 */
export function SubmitButton({
  children,
  pendingLabel,
  className,
  size,
  variant,
}: {
  children: React.ReactNode
  pendingLabel: string
  className?: string
  size?: React.ComponentProps<typeof Button>['size']
  variant?: React.ComponentProps<typeof Button>['variant']
}) {
  const { pending } = useFormStatus()

  return (
    <Button
      type="submit"
      size={size}
      variant={variant}
      className={className}
      disabled={pending}
      aria-busy={pending}
    >
      {pending ? (
        <>
          <Loader2 className="size-4 animate-spin" aria-hidden />
          {pendingLabel}
        </>
      ) : (
        children
      )}
    </Button>
  )
}
