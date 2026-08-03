import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Nav } from '@/components/nav'
import { ThemeToggle } from '@/components/theme-toggle'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <>
      <header className="bg-background/85 border-border sticky top-0 z-40 border-b backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 py-2.5">
          <span className="flex items-center gap-2">
            <span className="bg-primary size-2 rounded-[2px]" aria-hidden />
            <span className="font-mono text-sm font-medium tracking-[0.22em] uppercase">
              Sangu
            </span>
          </span>
          <ThemeToggle />
        </div>
      </header>

      <div className="mx-auto w-full max-w-3xl px-4 pt-5 pb-28">{children}</div>

      <Nav />
    </>
  )
}
