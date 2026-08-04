'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, CalendarRange, Target, Settings, Wallet } from 'lucide-react'
import { cn } from '@/lib/utils'

const LINKS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/current', label: 'Bulan Ini', icon: CalendarRange },
  { href: '/spending', label: 'Belanja', icon: Wallet },
  { href: '/goals', label: 'Target', icon: Target },
  { href: '/settings', label: 'Pengaturan', icon: Settings },
]

function useIsActive() {
  const pathname = usePathname()
  return (href: string) => pathname === href || pathname.startsWith(`${href}/`)
}

/** Thumb-reachable tabs. Hidden once the pointer is likely a mouse. */
export function BottomNav() {
  const isActive = useIsActive()

  return (
    <nav className="bg-background/85 border-border fixed inset-x-0 bottom-0 z-50 border-t backdrop-blur-md lg:hidden">
      {/* The padding keeps the bar clear of the iOS home indicator once installed. */}
      <ul className="mx-auto flex w-full max-w-3xl pb-[env(safe-area-inset-bottom)]">
        {LINKS.map(({ href, label, icon: Icon }) => {
          const active = isActive(href)
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'relative flex flex-col items-center gap-1 py-2.5 transition-colors',
                  active
                    ? 'text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {/* A kunyit tick at the top edge, like the tab marker on a ledger.
                    Colour is never the only signal — the weight changes too. */}
                <span
                  className={cn(
                    'bg-primary absolute top-0 h-0.5 w-8 rounded-full transition-opacity',
                    active ? 'opacity-100' : 'opacity-0'
                  )}
                  aria-hidden
                />
                <Icon
                  className="size-[1.15rem]"
                  strokeWidth={active ? 2.25 : 1.75}
                  aria-hidden
                />
                <span
                  className={cn(
                    'font-mono text-[0.625rem] tracking-[0.08em] uppercase',
                    active && 'font-medium'
                  )}
                >
                  {label}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

/**
 * The same five destinations as a row in the header. A bottom tab bar stranded
 * across a 1440px monitor reads as a phone app that was never finished.
 */
export function HeaderNav() {
  const isActive = useIsActive()

  return (
    <nav className="hidden lg:block">
      <ul className="flex items-center gap-1">
        {LINKS.map(({ href, label }) => {
          const active = isActive(href)
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'relative block rounded-md px-3 py-1.5 font-mono text-[0.7rem] tracking-[0.12em] uppercase transition-colors',
                  active
                    ? 'text-foreground font-medium'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
                )}
              >
                {label}
                <span
                  className={cn(
                    'bg-primary absolute inset-x-3 -bottom-px h-0.5 rounded-full transition-opacity',
                    active ? 'opacity-100' : 'opacity-0'
                  )}
                  aria-hidden
                />
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
