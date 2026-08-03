import { ErrorState } from '@/components/error-state'

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg items-center px-4">
      <div className="w-full">
        <ErrorState
          label="404"
          title="Halaman tidak ada"
          body="Sangu cuma punya empat halaman: Dashboard, Bulan Ini, Target, dan Pengaturan."
        />
      </div>
    </main>
  )
}
