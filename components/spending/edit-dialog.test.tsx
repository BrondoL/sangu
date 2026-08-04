import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { SpendingFields, type SpendingEntry } from './edit-dialog'

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

const render = (e: SpendingEntry, pos = budgets) =>
  renderToStaticMarkup(
    <SpendingFields entry={e} budgets={pos} notes={['kopi', 'laundry']} />
  )

describe('the edit form, opened on a row', () => {
  const html = render(entry)

  it('carries the row it is correcting', () => {
    expect(html).toContain('name="id" value="row-1"')
  })

  it('submits the amount as integer rupiah and shows it masked', () => {
    // The hidden field is what the action reads; the visible one is the mask.
    expect(html).toContain('name="amount" value="250000"')
    expect(html).toContain('Rp 250.000')
  })

  it('starts from the row’s own date and note, not from today', () => {
    expect(html).toContain('name="occurred_on" value="2026-08-20"')
    expect(html).toContain('name="note" value="kopi"')
  })

  it('preselects the pos the row is filed under', () => {
    expect(html).toContain('<option value="jajan" selected="">Jajan</option>')
  })

  it('can still file the row as tak terduga', () => {
    expect(html).toContain('<option value="">Tak terduga</option>')
  })

  it('gives its fields ids of their own', () => {
    // The capture form at the top of the page owns #amount and #occurred_on.
    expect(html).toContain('id="edit-row-1-amount"')
    expect(html).not.toContain('id="amount"')
  })
})

describe('the edit form, opened on a row with no pos', () => {
  const html = render({ ...entry, recurring_expense_id: null, note: null })

  it('preselects tak terduga', () => {
    expect(html).toContain('<option value="" selected="">Tak terduga</option>')
  })
})

describe('the edit form, opened on a row whose pos is no longer tracked', () => {
  // The list shows this row as "Tak terduga" because no budget line claims it.
  // The dialog must not agree: preselecting the empty option would refile the
  // row to nothing the moment its amount was corrected.
  const html = render({ ...entry, recurring_expense_id: 'skincare' }, [
    ...budgets,
    { id: 'skincare', name: 'Skincare (tidak dilacak)' },
  ])

  it('keeps the row where it is', () => {
    expect(html).toContain('<option value="skincare" selected="">')
    expect(html).not.toContain('<option value="" selected="">')
  })
})
