import { login } from '@/app/auth/actions'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Eyebrow } from '@/components/kwitansi'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams

  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <div className="w-full max-w-xs">
        {/* The cover of the document, not a product landing page. */}
        <div className="mb-8">
          <span className="flex items-center gap-2.5">
            <span className="bg-primary size-2.5 rounded-[2px]" aria-hidden />
            <h1 className="font-mono text-xl font-medium tracking-[0.3em] uppercase">
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
      </div>
    </main>
  )
}
