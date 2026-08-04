/**
 * Supabase mints a token on the auth server and validates it on a PostgREST node,
 * and those are different machines. A node whose clock lags by a second or two
 * reads a freshly minted token's `iat` as being in the future and answers
 * PGRST303 instead of the rows.
 *
 * It only bites in the moment right after a refresh — the first open of the day,
 * where the proxy renews the session and the page queries with a token that is
 * milliseconds old. Sibling queries in the same render land on other nodes and
 * succeed, so the page throws on one query out of four and the next reload is
 * clean, the token having aged past the lag by then.
 *
 * Nothing the app can do stops the skew, but the request is worth repeating
 * rather than surfacing: the lag is finite, and a later attempt may also land on
 * a node that is on time.
 */
const CLOCK_SKEW_CODE = 'PGRST303'

/** Spaced to outlast a lag of about a second without stalling a healthy page. */
const RETRY_DELAYS_MS = [250, 750] as const

const sleep = (ms: number) =>
  ms > 0 ? new Promise((resolve) => setTimeout(resolve, ms)) : Promise.resolve()

async function isClockSkew(response: Response): Promise<boolean> {
  // Cheap gate first: reading the body costs a clone, and all but one response
  // in a thousand is not a 401 at all.
  if (response.status !== 401) return false
  try {
    // Cloned so the caller still gets an unread body — this is the response they
    // receive if the retries run out.
    const body = await response.clone().json()
    return body?.code === CLOCK_SKEW_CODE
  } catch {
    // A 401 from a gateway rather than PostgREST: not JSON, not our case.
    return false
  }
}

/**
 * Wraps `fetch` so a request rejected for clock skew is repeated. Every other
 * response, including a genuine auth failure, is returned untouched on the first
 * attempt.
 */
export function fetchRetryingClockSkew(
  baseFetch: typeof fetch = fetch,
  delaysMs: readonly number[] = RETRY_DELAYS_MS
): typeof fetch {
  return async (input, init) => {
    let response = await baseFetch(input, init)

    for (const delay of delaysMs) {
      if (!(await isClockSkew(response))) return response
      await sleep(delay)
      response = await baseFetch(input, init)
    }

    return response
  }
}
