import { describe, it, expect, vi } from 'vitest'
import { fetchRetryingClockSkew } from './retry'

const skew = () =>
  new Response(
    JSON.stringify({
      code: 'PGRST303',
      details: null,
      hint: null,
      message: 'JWT issued at future',
    }),
    { status: 401 }
  )

const ok = () => new Response(JSON.stringify([{ id: 1 }]), { status: 200 })

/** Retries are configured with no delay so the tests do not wait on real time. */
const noWait = [0, 0] as const

describe('fetchRetryingClockSkew', () => {
  it('passes a successful response straight through', async () => {
    const base = vi.fn(async () => ok())
    const response = await fetchRetryingClockSkew(base, noWait)('/rest/v1/x')

    expect(base).toHaveBeenCalledTimes(1)
    expect(response.status).toBe(200)
  })

  it('repeats the request when the node calls the token future-dated', async () => {
    const base = vi
      .fn<() => Promise<Response>>()
      .mockResolvedValueOnce(skew())
      .mockResolvedValueOnce(ok())
    const response = await fetchRetryingClockSkew(base, noWait)('/rest/v1/x')

    expect(base).toHaveBeenCalledTimes(2)
    expect(response.status).toBe(200)
  })

  it('leaves the caller a readable body after the retry', async () => {
    const base = vi
      .fn<() => Promise<Response>>()
      .mockResolvedValueOnce(skew())
      .mockResolvedValueOnce(ok())
    const response = await fetchRetryingClockSkew(base, noWait)('/rest/v1/x')

    await expect(response.json()).resolves.toEqual([{ id: 1 }])
  })

  it('gives up and returns the last response once the attempts run out', async () => {
    const base = vi.fn(async () => skew())
    const response = await fetchRetryingClockSkew(base, noWait)('/rest/v1/x')

    expect(base).toHaveBeenCalledTimes(3)
    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toMatchObject({ code: 'PGRST303' })
  })

  it('does not repeat a 401 that is a real authentication failure', async () => {
    const base = vi.fn(
      async () =>
        new Response(JSON.stringify({ code: 'PGRST301' }), { status: 401 })
    )
    const response = await fetchRetryingClockSkew(base, noWait)('/rest/v1/x')

    expect(base).toHaveBeenCalledTimes(1)
    expect(response.status).toBe(401)
  })

  it('does not repeat a non-401 error', async () => {
    const base = vi.fn(async () => new Response('nope', { status: 500 }))
    await fetchRetryingClockSkew(base, noWait)('/rest/v1/x')

    expect(base).toHaveBeenCalledTimes(1)
  })

  it('does not choke on a 401 whose body is not JSON', async () => {
    const base = vi.fn(async () => new Response('gateway', { status: 401 }))
    const response = await fetchRetryingClockSkew(base, noWait)('/rest/v1/x')

    expect(base).toHaveBeenCalledTimes(1)
    expect(response.status).toBe(401)
  })

  it('forwards the request unchanged on every attempt', async () => {
    const base = vi
      .fn<() => Promise<Response>>()
      .mockResolvedValueOnce(skew())
      .mockResolvedValueOnce(ok())
    const init = { method: 'POST', body: '{"amount":1}' }
    await fetchRetryingClockSkew(base, noWait)('/rest/v1/spending', init)

    expect(base).toHaveBeenNthCalledWith(1, '/rest/v1/spending', init)
    expect(base).toHaveBeenNthCalledWith(2, '/rest/v1/spending', init)
  })
})
