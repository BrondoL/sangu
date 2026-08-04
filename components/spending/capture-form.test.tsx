// @vitest-environment jsdom
//
// The rest of this suite runs in `node` and asserts markup. That is enough for
// a component whose output is a function of its props, and no use at all for
// the thing being asserted here, which is what the form holds *after* a
// submission — state across time, invisible to both `tsc` and static markup.
// The docblock above buys a DOM for this file alone, so the node-environment
// files keep running exactly as they did.
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react'
import { CaptureForm } from './capture-form'
import type { ActionState } from '@/lib/types'

// Sonner's toaster is mounted by the app shell, not by this form; without it
// `toast.success` is a no-op queue push. Stubbed anyway so a submission asserts
// nothing but the form.
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

afterEach(cleanup)

const budgets = [{ id: 'jajan', name: 'Jajan' }]

/** The masked field the user types into. */
const masked = () => screen.getByLabelText('Nominal') as HTMLInputElement
/** The hidden field the server action actually reads. */
const submitted = () =>
  document.querySelector('input[type="hidden"][name="amount"]') as HTMLInputElement

function setUp(action: (prev: ActionState, fd: FormData) => Promise<ActionState>) {
  render(
    <CaptureForm
      budgets={budgets}
      notes={[]}
      defaultDate="2026-08-04"
      action={action}
    />
  )
}

/** Type an amount the way the masked field receives it, then submit. */
async function record(amount: string) {
  fireEvent.change(masked(), { target: { value: amount } })
  await act(async () => {
    fireEvent.submit(screen.getByRole('button', { name: 'Catat' }).closest('form')!)
  })
}

describe('the capture form, after an entry is recorded', () => {
  it('clears the amount', async () => {
    const action = vi.fn(async (): Promise<ActionState> => ({ ok: true }))
    setUp(action)

    await record('150000')
    expect(action).toHaveBeenCalledTimes(1)

    // Not "the field looks empty" — the hidden field is what gets posted.
    expect(masked().value).toBe('Rp 0')
    expect(submitted().value).toBe('0')
  })

  it('does not resubmit the last amount as the next entry’s', async () => {
    // The failure this exists for: the amount is left standing, the next
    // Catat is pressed on a form that looks filled in, and yesterday's figure
    // is written to the ledger as today's. Nothing errors, and the record is
    // wrong.
    const amounts: string[] = []
    const action = vi.fn(async (_prev: ActionState, fd: FormData): Promise<ActionState> => {
      amounts.push(String(fd.get('amount')))
      return { ok: true }
    })
    setUp(action)

    await record('150000')
    // Second Catat with nothing retyped.
    await act(async () => {
      fireEvent.submit(screen.getByRole('button', { name: 'Catat' }).closest('form')!)
    })

    expect(amounts).toEqual(['150000', '0'])
  })

  it('keeps the amount when the action reports a failure', async () => {
    // Clearing on a rejected submission would throw away what the user typed
    // and give them nothing to correct.
    const action = vi.fn(
      async (): Promise<ActionState> => ({ ok: false, message: 'Nominal wajib diisi' })
    )
    setUp(action)

    await record('150000')

    expect(masked().value).toBe('Rp 150.000')
    expect(submitted().value).toBe('150000')
  })
})
