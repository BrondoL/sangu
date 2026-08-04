import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/lib/database.types'
import { fetchRetryingClockSkew } from './retry'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // A token minted seconds ago can read as future-dated on a PostgREST node
      // whose clock lags, which fails one query out of a page's several. See
      // lib/supabase/retry.ts for why that is worth repeating rather than throwing.
      global: { fetch: fetchRetryingClockSkew() },
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // called from a Server Component — safe to ignore; middleware refreshes.
          }
        },
      },
    }
  )
}
