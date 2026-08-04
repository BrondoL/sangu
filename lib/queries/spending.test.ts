import { describe, it, expect, vi } from 'vitest'

// The only two things this module reaches for at import time. Neither is what
// is under test here: `listNotes` does no writing, so nothing is revalidated,
// and the rows are handed in directly below.
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

const rows = vi.hoisted(() => ({ current: [] as { note: string | null }[] }))

vi.mock('@/lib/supabase/server', () => {
  // The read `listNotes` makes, as a chain that ends in the rows: from →
  // select → not → order → limit. Every link returns the same object, so the
  // order of the calls is not what this asserts — the ranking is.
  const query = {
    select: () => query,
    not: () => query,
    order: () => query,
    limit: async () => ({ data: rows.current, error: null }),
  }
  return { createClient: async () => ({ from: () => query }) }
})

const { listNotes } = await import('./spending')

/** The rows as the query returns them: newest first. */
function given(...notes: (string | null)[]) {
  rows.current = notes.map((note) => ({ note }))
}

describe('the notes offered under the note field', () => {
  it('puts the most-used first, not the most recent', async () => {
    // "Laundry" was last typed four entries ago and is still the answer to
    // "what do I type often" — which is the question the buttons ask.
    given('Kopi', 'Bensin', 'Laundry', 'Laundry', 'Laundry')

    expect(await listNotes()).toEqual(['Laundry', 'Kopi', 'Bensin'])
  })

  it('breaks a tie by the most recent, which is the order it used to return', async () => {
    given('Kopi', 'Bensin', 'Laundry')

    expect(await listNotes()).toEqual(['Kopi', 'Bensin', 'Laundry'])
  })

  it('counts one note however it was capitalised, and keeps the newest spelling', async () => {
    given('Laundry', 'laundry', 'LAUNDRY', 'Kopi', 'Kopi')

    expect(await listNotes()).toEqual(['Laundry', 'Kopi'])
  })

  it('drops the blank and the whitespace-only, and trims the rest', async () => {
    given('  Kopi  ', '', '   ', null)

    expect(await listNotes()).toEqual(['Kopi'])
  })
})
