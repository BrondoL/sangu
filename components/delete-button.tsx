'use client'

import { useTransition } from 'react'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import type { ActionState } from '@/lib/types'

export function DeleteButton({
  id,
  label,
  description,
  consequence = 'Data yang dihapus tidak bisa dikembalikan.',
  triggerLabel,
  action,
}: {
  id: string
  label: string
  /**
   * What else identifies the thing being deleted, when the label alone does
   * not. A spending row's label is its amount, and several rows in a month can
   * carry the same one — the date and the pos are what tell them apart. Older
   * callers name a unique record and pass nothing here.
   */
  description?: string
  /**
   * What confirming actually costs. Deletion is normally final, which is the
   * default. A generated row on a month is the exception: it comes back next
   * month on its own, and can be restored into this one.
   */
  consequence?: string
  /**
   * Renders the trigger as a muted text button carrying this label, instead of
   * the ghost trash icon. For a trigger that stands alone rather than sitting
   * at the end of a row, where an icon would have nothing to be read against.
   */
  triggerLabel?: string
  action: (id: string) => Promise<ActionState>
}) {
  const [pending, startTransition] = useTransition()
  const named = description ? `${label}, ${description}` : label

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        {triggerLabel ? (
          // The text is its own accessible name, so no aria-label here.
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground h-auto p-0 text-xs font-normal underline underline-offset-2"
          >
            {triggerLabel}
          </Button>
        ) : (
          <Button variant="ghost" size="icon" aria-label={`Hapus ${named}`}>
            <Trash2 className="size-4" />
          </Button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Hapus {label}?</AlertDialogTitle>
          <AlertDialogDescription>
            {description && (
              <span className="text-foreground mb-1 block">{description}</span>
            )}
            {consequence}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Batal</AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await action(id)
                if (result && !result.ok) toast.error(result.message)
                else toast.success('Dihapus')
              })
            }
          >
            Hapus
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
