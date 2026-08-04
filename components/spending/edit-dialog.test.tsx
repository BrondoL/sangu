// @vitest-environment jsdom
//
// This file asserted markup, which was enough while the pos was a native
// `<select>`: `renderToStaticMarkup` printed the options and the `selected`
// one among them. The pos is now a Radix Select, which renders its options
// into a document fragment on mount and posts through a hidden `<select>` it
// builds there — none of which exists in server-rendered markup. So the same
// facts are asserted one layer lower down, against the FormData the dialog
// would actually submit, which is what the assertions were ever about.
import { describe, it, expect, beforeAll, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react'
import { SpendingFields, type SpendingEntry } from './edit-dialog'
import { TAK_TERDUGA } from '@/lib/pos'

// jsdom implements neither pointer capture nor scrollIntoView; Radix's Select
// uses both to open. They stand in for the browser, nothing more.
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

const entry: SpendingEntry = {
  id: 'row-1',
  amount: 250000,
  occurred_on: '2026-08-20',
  recurring_expense_id: 'jajan',
  note: 'kopi',
}

/**
 * The fields inside a form, because that is where the dialog puts them — and
 * because Radix only renders the hidden control that carries its value into a
 * submission when it finds a form around it.
 */
function open(e: SpendingEntry, pos = budgets) {
  const { container } = render(
    <form>
      <SpendingFields entry={e} budgets={pos} notes={['kopi', 'laundry']} />
    </form>
  )
  const form = container.querySelector('form')!
  return { form, posted: () => new FormData(form) }
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

describe('the edit form, opened on a row', () => {
  it('carries the row it is correcting', () => {
    expect(open(entry).posted().get('id')).toBe('row-1')
  })

  it('submits the amount as integer rupiah and shows it masked', () => {
    // The hidden field is what the action reads; the visible one is the mask.
    const { posted } = open(entry)
    expect(posted().get('amount')).toBe('250000')
    expect((screen.getByLabelText('Nominal') as HTMLInputElement).value).toBe('Rp 250.000')
  })

  it('starts from the row’s own date and note, not from today', () => {
    const { posted } = open(entry)
    expect(posted().get('occurred_on')).toBe('2026-08-20')
    expect(posted().get('note')).toBe('kopi')
  })

  it('preselects the pos the row is filed under', () => {
    const { posted } = open(entry)
    expect(posted().get('recurring_expense_id')).toBe('jajan')
    expect(screen.getByLabelText('Pos').textContent).toBe('Jajan')
  })

  it('can still file the row as tak terduga', async () => {
    const { posted } = open(entry)

    await choosePos('Tak terduga')

    expect(posted().get('recurring_expense_id')).toBe(TAK_TERDUGA)
  })

  it('gives its fields ids of their own', () => {
    // The capture form at the top of the page owns #amount and #occurred_on.
    const { form } = open(entry)
    expect(form.querySelector('#edit-row-1-amount')).not.toBeNull()
    expect(form.querySelector('#amount')).toBeNull()
    expect(form.querySelector('#occurred_on')).toBeNull()
  })
})

describe('the edit form, opened on a row with no pos', () => {
  it('preselects tak terduga', () => {
    const { posted } = open({ ...entry, recurring_expense_id: null, note: null })
    expect(posted().get('recurring_expense_id')).toBe(TAK_TERDUGA)
    expect(screen.getByLabelText('Pos').textContent).toBe('Tak terduga')
  })
})

describe('the edit form, opened on a row whose pos is no longer tracked', () => {
  // The list shows this row as "Tak terduga" because no budget line claims it.
  // The dialog must not agree: preselecting no pos would refile the row to
  // nothing the moment its amount was corrected.
  it('keeps the row where it is', () => {
    const { posted } = open({ ...entry, recurring_expense_id: 'skincare' }, [
      ...budgets,
      { id: 'skincare', name: 'Skincare (tidak dilacak)' },
    ])
    expect(posted().get('recurring_expense_id')).toBe('skincare')
    expect(posted().get('recurring_expense_id')).not.toBe(TAK_TERDUGA)
    expect(screen.getByLabelText('Pos').textContent).toBe('Skincare (tidak dilacak)')
  })
})
