// @vitest-environment jsdom
//
// The pos field is the one thing in this form that markup cannot vouch for.
// Radix's Select is not a form control: it posts through a hidden `<select>`
// its Root renders, and only when the Root carries `name`. Get that wrong and
// the page still looks perfect, `tsc` still passes, and every entry is written
// as tak terduga. So this file submits the form and reads the FormData the
// action was actually handed.
import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react'
import { CaptureForm } from './capture-form'
import { TAK_TERDUGA } from '@/lib/pos'
import type { ActionState } from '@/lib/types'

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

// Radix's Select opens on pointer events and scrolls the chosen item into
// view. jsdom implements neither, so opening the listbox throws without these
// three. They stand in for the browser, not for anything this app wrote.
beforeAll(() => {
  Element.prototype.hasPointerCapture = () => false
  Element.prototype.setPointerCapture = () => {}
  Element.prototype.releasePointerCapture = () => {}
  Element.prototype.scrollIntoView = () => {}
})

afterEach(cleanup)

const budgets = [
  { id: 'jajan', name: 'Jajan' },
  { id: 'makan', name: 'Makan' },
]

/** Every FormData the action receives, in order. */
function setUp() {
  const posted: FormData[] = []
  const action = vi.fn(async (_prev: ActionState, fd: FormData): Promise<ActionState> => {
    posted.push(fd)
    return { ok: true }
  })
  render(
    <CaptureForm
      budgets={budgets}
      notes={[]}
      defaultDate="2026-08-04"
      action={action}
    />
  )
  return posted
}

async function submit() {
  await act(async () => {
    fireEvent.submit(screen.getByRole('button', { name: 'Catat' }).closest('form')!)
  })
}

/** Open the pos listbox and choose one, the way a tap does. */
async function choosePos(name: string) {
  await act(async () => {
    fireEvent.pointerDown(screen.getByLabelText('Pos'), {
      button: 0,
      ctrlKey: false,
      pointerType: 'mouse',
    })
  })
  await act(async () => {
    fireEvent.click(screen.getByRole('option', { name }))
  })
}

describe('the pos the capture form submits', () => {
  it('posts the budget the user chose', async () => {
    const posted = setUp()

    await choosePos('Makan')
    await submit()

    expect(posted).toHaveLength(1)
    expect(posted[0].get('recurring_expense_id')).toBe('makan')
  })

  it('posts the tak terduga sentinel when nothing is chosen', async () => {
    // Not the empty string, and above all not nothing at all: a form that
    // posts no `recurring_expense_id` at all reads identically to one that
    // posts tak terduga, so this asserts the key is present.
    const posted = setUp()

    await submit()

    expect(posted[0].has('recurring_expense_id')).toBe(true)
    expect(posted[0].get('recurring_expense_id')).toBe(TAK_TERDUGA)
  })

  it('goes back to tak terduga for the next entry', async () => {
    // The form clears itself after a successful entry. If the pos stayed put,
    // the next Catat would file a fresh entry under the last one's budget.
    const posted = setUp()

    await choosePos('Jajan')
    await submit()
    await submit()

    expect(posted.map((fd) => fd.get('recurring_expense_id'))).toEqual([
      'jajan',
      TAK_TERDUGA,
    ])
  })
})
