'use client'

import { useTransition } from 'react'
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
import { formatRupiah } from '@/lib/format'
import type { ActionState } from '@/lib/types'

/**
 * The one place this feature writes the planner's data. Never one tap: the
 * dialog puts the old and new figure side by side first.
 */
export function AdjustButton({
  id,
  name,
  from,
  to,
  action,
}: {
  id: string
  name: string
  from: number
  to: number
  action: (id: string, amount: number) => Promise<ActionState>
}) {
  const [pending, startTransition] = useTransition()

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm">
          Ubah jadi {formatRupiah(to)}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Ubah budget {name}?</AlertDialogTitle>
          <AlertDialogDescription>
            Dari {formatRupiah(from)} jadi {formatRupiah(to)}. Ini mengubah
            definisi pengeluaran rutin, jadi bulan-bulan berikutnya akan
            memakai angka baru. Bulan yang sudah tercatat tidak berubah.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Batal</AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await action(id, to)
                if (result && !result.ok) toast.error(result.message)
                else toast.success('Budget diubah')
              })
            }
          >
            Ubah
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
