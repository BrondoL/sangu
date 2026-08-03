'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { ErrorState } from '@/components/error-state'

/** Fallback for anything outside the app shell — the login page, mostly. */
export default function RootError({
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
    <main className="mx-auto flex min-h-dvh w-full max-w-lg items-center px-4">
      <div className="w-full">
        <ErrorState
          label="Gagal memuat"
          title="Ada yang tidak beres"
          body="Coba lagi. Kalau terus berulang, periksa koneksi dan setelan Supabase di .env.local."
          detail={error.digest ? `${error.message} · ${error.digest}` : error.message}
          action={<Button onClick={reset}>Coba lagi</Button>}
        />
      </div>
    </main>
  )
}
