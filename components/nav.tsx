'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, CalendarRange, Target, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

const LINKS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/current', label: 'Bulan Ini', icon: CalendarRange },
  { href: '/goals', label: 'Target', icon: Target },
  { href: '/settings', label: 'Pengaturan', icon: Settings },
]

export function Nav() {
  const pathname = usePathname()

  return (
    <nav className="bg-background/85 border-border fixed inset-x-0 bottom-0 z-50 border-t backdrop-blur-md">
      {/* The padding keeps the bar clear of the iOS home indicator once installed. */}
      <ul className="mx-auto flex w-full max-w-3xl pb-[env(safe-area-inset-bottom)]">
        {LINKS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`)
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
