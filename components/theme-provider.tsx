'use client'

import { ThemeProvider as NextThemes } from 'next-themes'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemes
      attribute="class"
      defaultTheme="system"
      enableSystem
      // The colour change is instant on purpose — a cross-fade on every surface
      // at once reads as a glitch rather than a transition.
      disableTransitionOnChange
    >
      {children}
    </NextThemes>
  )
}
