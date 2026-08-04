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
  action: (id: string) => Promise<ActionState>
}) {
  const [pending, startTransition] = useTransition()
  const named = description ? `${label}, ${description}` : label

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`Hapus ${named}`}>
          <Trash2 className="size-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Hapus {label}?</AlertDialogTitle>
          <AlertDialogDescription>
            {description && (
              <span className="text-foreground mb-1 block">{description}</span>
            )}
            Data yang dihapus tidak bisa dikembalikan.
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
