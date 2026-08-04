'use client'

import { Fragment, useActionState, useState, type ReactNode } from 'react'
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

  // Every open mounts the fields fresh. Radix does unmount the dialog's
  // children on close, which is what normally hands the fields their defaults
  // back — but only once the close animation has finished, and `DialogContent`
  // here animates out. Reopening inside that window keeps the old subtree
  // alive, and `RupiahInput` holds its amount in React state, which no changed
  // `defaultValue` can reach (the same reason `CaptureForm` clears itself by
  // remounting through a key rather than by `form.reset()`). Without this, a
  // dialog dismissed and reopened in one motion — or opened on a second row
  // while the first is still fading — shows the previous amount, which on a
  // ledger is a wrong figure presented as the row's own.
  const [opens, setOpens] = useState(0)

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
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) setOpens((n) => n + 1)
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <Fragment key={opens}>{children}</Fragment>
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
