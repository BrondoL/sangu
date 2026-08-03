import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { SubmitButton } from './submit-button'

// The hook reports the enclosing form's submission; drive it directly so the
// pending branch can be asserted without a browser and a live server action.
vi.mock('react-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-dom')>()),
  useFormStatus: () => ({ pending: true }),
}))

describe('SubmitButton while its form is submitting', () => {
  const html = renderToStaticMarkup(
    <SubmitButton pendingLabel="Memeriksa…">Masuk</SubmitButton>
  )

  it('swaps the label rather than only spinning', () => {
    // The reduced-motion rule freezes the spinner, so the words have to carry
    // the state on their own.
    expect(html).toContain('Memeriksa…')
    expect(html).not.toContain('>Masuk<')
  })
  it('shows a spinner', () => {
    expect(html).toContain('animate-spin')
  })
  it('blocks a second submission and announces itself', () => {
    expect(html).toContain('disabled')
    expect(html).toContain('aria-busy="true"')
  })
})
