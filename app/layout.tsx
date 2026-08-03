import type { Metadata, Viewport } from 'next'
import { Schibsted_Grotesk, IBM_Plex_Mono } from 'next/font/google'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

// Schibsted Grotesk carries the voice: sturdy, slightly editorial, and not the
// grotesk every other dashboard reaches for.
const schibsted = Schibsted_Grotesk({
  variable: '--font-schibsted',
  subsets: ['latin'],
  display: 'swap',
})

// Every rupiah figure and every eyebrow label is set in Plex Mono, so amounts
// line up down a column and small labels read like a printed form.
const plexMono = IBM_Plex_Mono({
  variable: '--font-plex-mono',
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Sangu',
  description: 'Perencana anggaran bulanan',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'Sangu' },
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#faf8f3' },
    { media: '(prefers-color-scheme: dark)', color: '#0c1626' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    // suppressHydrationWarning: next-themes writes the theme class onto <html>
    // before paint, so the server markup never matches on the first pass.
    <html
      lang="id"
      suppressHydrationWarning
      className={`${schibsted.variable} ${plexMono.variable} h-full`}
    >
      <body className="flex min-h-full flex-col">
        <ThemeProvider>
          {children}
          {/* richColors gives error/success toasts their red/green treatment;
              without it sonner renders every type in the neutral popover style. */}
          <Toaster richColors />
        </ThemeProvider>
      </body>
    </html>
  )
}
