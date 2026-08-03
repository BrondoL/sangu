import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

function Bar({ className }: { className?: string }) {
  return <div className={cn('bg-muted h-3 animate-pulse rounded', className)} />
}

/**
 * Route-level placeholder. Deliberately blocky rather than a faithful copy of
 * the page: a skeleton that mimics the real layout too closely reads as content
 * that failed to load.
 */
export function SkeletonPage({ title }: { title: string }) {
  return (
    <div className="space-y-4">
      <div className="mb-5 flex items-end justify-between gap-4">
        <h1 className="text-[1.75rem] leading-none font-semibold tracking-[-0.02em]">
          {title}
        </h1>
        <Bar className="h-9 w-40 rounded-lg" />
      </div>

      <Card>
        <CardContent className="space-y-3 py-6">
          <Bar className="w-40" />
          <Bar className="h-9 w-56" />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 py-6">
          <Bar className="w-32" />
          <Bar className="w-full" />
          <Bar className="w-4/5" />
          <Bar className="w-2/3" />
        </CardContent>
      </Card>
    </div>
  )
}
