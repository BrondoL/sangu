'use client'

import { useTheme } from 'next-themes'
import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'

/**
 * Two states, not three. "System" is the starting point but not worth cycling
 * back through — once you have expressed a preference, the button just flips it.
 *
 * Which icon shows is decided in CSS off the `.dark` class rather than in React,
 * so there is no hydration mismatch and no mounted flag: the server cannot know
 * the resolved theme, but the stylesheet does not need to.
 */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
    >
      <Sun className="hidden size-[1.15rem] dark:block" aria-hidden />
      <Moon className="size-[1.15rem] dark:hidden" aria-hidden />
      <span className="sr-only dark:hidden">Ganti ke mode gelap</span>
      <span className="sr-only hidden dark:inline">Ganti ke mode terang</span>
    </Button>
  )
}
