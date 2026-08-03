'use client'

import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

/**
 * Copies the figure as bare digits — no "Rp", no thousand separators — because
 * the next thing that happens to it is being pasted into a banking app, and
 * those reject punctuation.
 */
export function CopyAmount({ value }: { value: number }) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(String(value))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard access needs a secure context; over plain http on a phone
      // there is nothing to fall back to, so say so rather than failing quietly.
      toast.error('Browser menolak akses clipboard — salin manual.')
    }
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={copy}
      aria-label="Salin nominal transfer"
    >
      {copied ? (
        <>
          <Check className="size-4" /> Tersalin
        </>
      ) : (
        <>
          <Copy className="size-4" /> Salin
        </>
      )}
    </Button>
  )
}
