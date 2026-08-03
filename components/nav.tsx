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
    <nav className="bg-background/95 fixed inset-x-0 bottom-0 z-50 border-t backdrop-blur">
      <ul className="mx-auto flex w-full max-w-3xl">
        {LINKS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`)
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex flex-col items-center gap-1 py-2 text-xs transition-colors',
                  active
                    ? 'text-foreground font-medium'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className="size-5" aria-hidden />
                {label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
