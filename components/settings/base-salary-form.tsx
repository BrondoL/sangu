'use client'

import { useActionState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RupiahInput } from '@/components/rupiah-input'
import { saveBaseSalaryAction } from '@/app/(app)/settings/actions'
import type { ActionState } from '@/lib/types'

export function BaseSalaryForm({ baseSalary }: { baseSalary: number }) {
  const [, formAction, pending] = useActionState(
    async (prev: ActionState, formData: FormData) => {
      const result = await saveBaseSalaryAction(prev, formData)
      if (result?.ok) toast.success('Gaji base tersimpan')
      else if (result) toast.error(result.message)
      return result
    },
    null
  )

  return (
    <form action={formAction} className="max-w-sm space-y-4">
      <div className="space-y-1">
        <Label htmlFor="base_salary">Gaji base</Label>
        <RupiahInput name="base_salary" defaultValue={baseSalary} />
        <p className="text-muted-foreground text-xs">
          Dipakai sebagai pembanding kecukupan saat gaji aktual bulan itu belum diisi.
        </p>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? 'Menyimpan…' : 'Simpan'}
      </Button>
    </form>
  )
}
