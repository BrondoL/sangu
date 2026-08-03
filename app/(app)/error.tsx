'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { ErrorState } from '@/components/error-state'

/**
 * Catches anything thrown by the authed pages. Every query in `lib/queries/`
 * rethrows the Supabase error, so without this a lapsed session shows Next's
 * bare production error page. Sits inside the app shell, so the header and
 * navigation stay usable.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <ErrorState
      label="Gagal memuat"
      title="Halaman ini tidak bisa dimuat"
      body="Paling sering karena sesi Supabase sudah kedaluwarsa atau koneksi terputus. Coba lagi dulu; kalau tetap gagal, keluar lalu masuk kembali."
      detail={error.digest ? `${error.message} · ${error.digest}` : error.message}
      action={<Button onClick={reset}>Coba lagi</Button>}
    />
  )
}
