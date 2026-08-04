// @vitest-environment jsdom
//
// What is under test is a window in time: Radix keeps a dialog's children
// mounted until its exit animation ends, and `FormDialog` remounts them anyway
// through `<Fragment key={opens}>`. jsdom runs no CSS, so out of the box
// `getComputedStyle().animationName` is empty, Radix takes the no-animation
// path and unmounts on close, and the window this guards never opens — the
// test would pass with the mechanism ripped out. So the one fact jsdom cannot
// supply is supplied below: that a dialog which is closing has an exit
// animation different from its enter animation. Nothing about the components
// is changed; only the browser fact they depend on is restored.
import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { useState } from 'react'
import { FormDialog } from './form-dialog'
import { RupiahInput } from './rupiah-input'
import { Label } from './ui/label'
import type { ActionState } from '@/lib/types'

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))

const realGetComputedStyle = window.getComputedStyle.bind(window)

beforeAll(() => {
  const stub = ((el: Element, pseudo?: string | null) => {
    const styles = realGetComputedStyle(el, pseudo)
    // Only the nodes Radix drives through `data-state` — everything else keeps
    // jsdom's real answer, so nothing else in the tree starts pretending to
    // animate.
    if (!el.hasAttribute?.('data-state')) return styles
    // Read on access, not at creation: Radix keeps the declaration object it
    // got at mount and re-reads it on close, relying on it being live the way
    // a browser's is.
    return new Proxy(styles, {
      get(target, prop, receiver) {
        if (prop === 'animationName') {
          return el.getAttribute('data-state') === 'closed' ? 'exit' : 'enter'
        }
        const value = Reflect.get(target, prop, receiver)
        return typeof value === 'function' ? value.bind(target) : value
      },
    })
  }) as typeof window.getComputedStyle
  // Vitest copies the jsdom window's globals onto `globalThis` as separate
  // bindings, and Radix calls the bare global. Both have to be replaced.
  window.getComputedStyle = stub
  globalThis.getComputedStyle = stub
})

afterAll(() => {
  window.getComputedStyle = realGetComputedStyle
  globalThis.getComputedStyle = realGetComputedStyle
})

afterEach(cleanup)

const noop = async (): Promise<ActionState> => ({ ok: true })

/**
 * One dialog, two rows, and a button that moves it from the first to the
 * second — the shape a list of editable rows has when the dialog outlives the
 * row it was opened on.
 */
function Harness() {
  const [amount, setAmount] = useState(150000)
  return (
    <>
      <button type="button" onClick={() => setAmount(250000)}>
        baris berikutnya
      </button>
      <FormDialog
        title="Ubah"
        action={noop}
        trigger={<button type="button">buka</button>}
      >
        <Label htmlFor="amount">Nominal</Label>
        <RupiahInput name="amount" id="amount" defaultValue={amount} />
      </FormDialog>
    </>
  )
}

/** The masked field the user reads. */
const masked = () => screen.getByLabelText('Nominal') as HTMLInputElement
/** The hidden field the action would receive. */
const submitted = () =>
  document.querySelector('input[type="hidden"][name="amount"]') as HTMLInputElement

// `hidden: true` because that is the whole point: a dialog still on its way
// out has `aria-hidden` over the rest of the page, so the trigger underneath
// is invisible to the accessibility tree while remaining a clickable button.
// The default role query would refuse to find it and the window could not be
// entered at all.
const button = (name: string) => screen.getByRole('button', { name, hidden: true })
const open = () => fireEvent.click(button('buka'))
const close = () => fireEvent.click(button('Close'))
const content = () => document.querySelector('[data-slot="dialog-content"]')

describe('a dialog reopened while its close is still animating out', () => {
  it('is genuinely reopened inside that window', () => {
    // Guards the two tests below: if Radix ever unmounts on close instead of
    // suspending, they would pass for the wrong reason and stop watching the
    // `Fragment key` at all.
    render(<Harness />)
    open()
    close()
    expect(content()).not.toBeNull()
    expect(content()?.getAttribute('data-state')).toBe('closed')
  })

  it('shows the second row’s amount, not the first row’s', () => {
    render(<Harness />)

    open()
    expect(submitted().value).toBe('150000')

    close()
    fireEvent.click(button('baris berikutnya'))
    open()

    // Without a remount, `RupiahInput` still holds the first row's amount in
    // React state, which no changed `defaultValue` can reach — the second row
    // would be presented with a figure that is not its own, on a form whose
    // Simpan button writes it back.
    expect(submitted().value).toBe('250000')
    expect(masked().value).toBe('Rp 250.000')
  })

  it('throws away an edit that was typed and then dismissed', () => {
    render(<Harness />)

    open()
    fireEvent.change(masked(), { target: { value: '999' } })
    expect(submitted().value).toBe('999')

    close()
    open()

    expect(submitted().value).toBe('150000')
    expect(masked().value).toBe('Rp 150.000')
  })
})
