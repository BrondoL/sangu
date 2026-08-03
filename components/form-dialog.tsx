'use client'

import { useActionState, useState, type ReactNode } from 'react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import type { ActionState } from '@/lib/types'

/**
 * Dialog + form plumbing shared by every settings editor: runs the action,
 * closes on success, toasts the server's message on failure.
 */
export function FormDialog({
  title,
  trigger,
  action,
  children,
}: {
  title: string
  trigger: ReactNode
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [, formAction, pending] = useActionState(
    async (prev: ActionState, formData: FormData) => {
      const result = await action(prev, formData)
      if (result?.ok) {
        setOpen(false)
        toast.success('Tersimpan')
      } else if (result) {
        toast.error(result.message)
      }
      return result
    },
    null
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          {children}
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? 'Menyimpan…' : 'Simpan'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
