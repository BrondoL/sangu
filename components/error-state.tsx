import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Eyebrow } from '@/components/kwitansi'

/**
 * The shape both the error boundary and the 404 wear. Failure states get the
 * same treatment as everything else here: say what happened, say what to do,
 * and don't apologise.
 */
export function ErrorState({
  label,
  title,
  body,
  detail,
  action,
}: {
  label: string
  title: string
  body: string
  /** The raw message. This app has one user and they wrote it — show them. */
  detail?: string
  action?: React.ReactNode
}) {
  return (
    <Card>
      <CardContent className="space-y-4 py-10 text-center">
        <div className="space-y-2">
          <Eyebrow>{label}</Eyebrow>
          <p className="text-lg font-medium">{title}</p>
          <p className="text-muted-foreground mx-auto max-w-sm text-sm text-balance">
            {body}
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-2">
          {action}
          <Button asChild variant="outline">
            <Link href="/dashboard">Ke Dashboard</Link>
          </Button>
        </div>

        {detail && (
          <p className="text-muted-foreground/80 border-rule mx-auto max-w-md border-t pt-3 font-mono text-xs break-words">
            {detail}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
