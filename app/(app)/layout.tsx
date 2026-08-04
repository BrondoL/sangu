import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { BottomNav, HeaderNav } from '@/components/nav'
import { ThemeToggle } from '@/components/theme-toggle'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  // Local JWT verification, same as the proxy — see lib/supabase/proxy.ts. The
  // proxy already gate-keeps this route, but a layout that trusts it blindly
  // would be one misconfigured matcher away from serving the page to anyone.
  const { data: claims } = await supabase.auth.getClaims()
  if (!claims) redirect('/login')

  return (
    <>
      <header className="bg-background/85 border-border sticky top-0 z-40 border-b backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-3xl items-center gap-6 px-4 py-2.5 lg:max-w-5xl">
          <span className="flex items-center gap-2">
            <span className="bg-primary size-2 rounded-[2px]" aria-hidden />
            <span className="font-mono text-sm font-medium tracking-[0.22em] uppercase">
              Sangu
            </span>
          </span>
          <HeaderNav />
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* The bottom bar only exists below lg, so the tail padding can go with it. */}
      <div className="mx-auto w-full max-w-3xl px-4 pt-5 pb-28 lg:max-w-5xl lg:pb-14">
        {children}
      </div>

      <BottomNav />
    </>
  )
}
