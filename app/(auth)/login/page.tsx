import { login } from '@/app/auth/actions'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Eyebrow } from '@/components/kwitansi'
import { currentMonthParam, formatMonthLabel } from '@/lib/month'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams

  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      {/*
        A single sheet with a kunyit edge — the same shape the transfer slip
        takes on the dashboard, so the first thing you see when signing in is
        built like the most important number in the app. The ground behind it
        stays bare: presence comes from the surface, not from texture.
      */}
      <Card className="border-primary w-full max-w-sm border-l-3 py-0">
        <CardContent className="px-6 py-7">
          <div className="mb-7">
            <span className="flex items-center gap-3">
              <span className="bg-primary size-3 rounded-[2px]" aria-hidden />
              <h1 className="font-mono text-2xl font-medium tracking-[0.3em] uppercase">
                Sangu
              </h1>
            </span>
            <div className="border-rule mt-4 border-t pt-3">
              <p className="text-muted-foreground text-sm text-balance">
                Bekal bulan ini, dihitung sekali duduk.
              </p>
            </div>
          </div>

          <form action={login} className="space-y-4">
            {error && (
              <p
                role="alert"
                className="border-destructive/35 bg-destructive/5 text-destructive rounded-lg border px-3 py-2 text-sm"
              >
                Email atau kata sandi salah.
              </p>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email">
                <Eyebrow>Email</Eyebrow>
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="username"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">
                <Eyebrow>Kata sandi</Eyebrow>
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
              />
            </div>

            <Button type="submit" size="lg" className="w-full">
              Masuk
            </Button>
          </form>

          {/* The period this document covers, stamped where a form stamps it. */}
          <div className="border-rule mt-7 flex items-baseline justify-between gap-3 border-t pt-3">
            <Eyebrow>Periode</Eyebrow>
            <span className="amount text-muted-foreground text-xs">
              {formatMonthLabel(currentMonthParam())}
            </span>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}
