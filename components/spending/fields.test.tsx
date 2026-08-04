// @vitest-environment jsdom
//
// The pos field is the one thing in this form that markup cannot vouch for.
// Radix's Select is not a form control: it posts through a hidden `<select>`
// its Root renders, and only when the Root carries `name`. Get that wrong and
// the page still looks perfect, `tsc` still passes, and every entry is written
// as tak terduga. So this file submits the form and reads the FormData the
// action was actually handed.
import { describe, it, expect, vi, beforeAll, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent, act, within } from '@testing-library/react'
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
function setUp(notes: string[] = []) {
  const posted: FormData[] = []
  const action = vi.fn(async (_prev: ActionState, fd: FormData): Promise<ActionState> => {
    posted.push(fd)
    return { ok: true }
  })
  render(
    <CaptureForm
      budgets={budgets}
      notes={notes}
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

/** The note field. */
const note = () => screen.getByLabelText('Catatan') as HTMLInputElement

/**
 * The suggestion chips, in the order they are shown — or none at all, which is
 * a state of its own: the row is not rendered rather than rendered empty.
 */
function suggestions() {
  const row = screen.queryByRole('group', { name: 'Catatan yang sering dipakai' })
  return row === null ? [] : within(row).getAllByRole('button').map((b) => b.textContent)
}

/** Type into the note field, as a keystroke does. */
function type(text: string) {
  fireEvent.change(note(), { target: { value: text } })
}

const saved = ['Laundry', 'Bensin', 'Beli galon', 'Kopi']

describe('the note suggestions', () => {
  it('offers them in the order the query ranked them', () => {
    setUp(saved)
    expect(suggestions()).toEqual(saved)
  })

  it('narrows to what has been typed, ignoring case', () => {
    setUp(saved)

    type('la')

    expect(suggestions()).toEqual(['Laundry'])
  })

  it('matches anywhere in the note, not only at its start', () => {
    // "Beli galon" is only reachable by its second word.
    setUp(saved)

    type('galon')

    expect(suggestions()).toEqual(['Beli galon'])
  })

  it('shows nothing at all when nothing matches', () => {
    setUp(saved)

    type('zzz')

    expect(suggestions()).toEqual([])
    // Not an empty row and not a message — the field stands alone, the way it
    // does before any note has been saved.
    expect(
      screen.queryByRole('group', { name: 'Catatan yang sering dipakai' })
    ).toBeNull()
  })

  it('caps the untyped row so it cannot become a wall on a phone', () => {
    setUp(Array.from({ length: 30 }, (_, i) => `Catatan ${i}`))
    expect(suggestions()).toHaveLength(12)
  })

  it('narrows to a suggestion that was tapped, and fills the field with it', () => {
    setUp(saved)

    fireEvent.click(screen.getByRole('button', { name: 'Bensin' }))

    expect(note().value).toBe('Bensin')
    expect(suggestions()).toEqual(['Bensin'])
  })

  it('still clears the field after an entry is recorded, and offers all of them again', async () => {
    // The field is uncontrolled on purpose: `form.reset()` is what clears it,
    // and a `value` prop would take that away. The filter has to follow the
    // reset, or the row stays narrowed beside an empty field.
    setUp(saved)

    type('la')
    await submit()

    expect(note().value).toBe('')
    expect(suggestions()).toEqual(saved)
  })
})
