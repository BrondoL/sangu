import { cache } from 'react'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/lib/database.types'
import { fetchRetryingClockSkew } from './retry'

/**
 * One client per request, not one per caller. A dashboard render asks for a client
 * from the layout and from each query module, and every one of those used to be a
 * separate GoTrue instance holding its own copy of the session. When the access
 * token was stale they would each move to renew it, and only the proxy can write
 * the result back — a server component's `setAll` is a no-op (see below), so those
 * renewals rotated the refresh token on Supabase's side and then dropped it. The
 * browser kept a token that had quietly been revoked, and the next open failed with
 * a 400 and sent the user back to the login screen.
 *
 * `cache()` is keyed per request by React, so concurrent server components share one
 * client and one session, and requests never see each other's.
 */
export const createClient = cache(async function createClient() {
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
})
