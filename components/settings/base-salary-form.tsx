'use client'

import { useActionState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Eyebrow } from '@/components/kwitansi'
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
    <Card>
      <CardContent className="space-y-4">
        <div className="border-rule border-b pb-3">
          <Eyebrow>Gaji base</Eyebrow>
          <p className="text-muted-foreground mt-1.5 text-sm text-pretty">
            Patokan kecukupan selama gaji aktual bulan itu belum diisi.
            Mengubahnya tidak menyentuh bulan yang sudah berjalan.
          </p>
        </div>

        <form action={formAction} className="flex flex-wrap items-end gap-3">
          <div className="min-w-0 flex-1 space-y-1.5">
            <Label htmlFor="base_salary">
              <Eyebrow>Nominal per bulan</Eyebrow>
            </Label>
            <RupiahInput name="base_salary" defaultValue={baseSalary} />
          </div>
          <Button type="submit" disabled={pending}>
            {pending ? 'Menyimpan…' : 'Simpan'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
