/**
 * "Tak terduga" — spending filed under no pos — as a value a form can carry.
 *
 * In the database this is `recurring_expense_id IS NULL`, and the form used to
 * say it with the empty string, which a native `<option value="">` can hold and
 * a Radix `SelectItem` cannot. So it gets a name of its own instead.
 *
 * It lives here, in a module with no 'use client' and no 'use server', because
 * both sides of the wire need it: the field puts it on the option, the actions
 * turn it back into null. A client module's exports become client references
 * when a server file imports them, so the constant could not live beside the
 * field; a 'use server' module may only export async functions, so it could not
 * live beside the queries either.
 */
export const TAK_TERDUGA = 'tak-terduga'

/**
 * What the pos field submitted, as the column wants it.
 *
 * The empty string is still mapped to null: a form posted by anything other
 * than this field — an older tab still holding the native select, say — must
 * not write the literal string '' into a uuid column.
 */
export function toRecurringExpenseId(submitted: string): string | null {
  return submitted === TAK_TERDUGA || submitted === '' ? null : submitted
}

/** The row's pos as the field's value: null is the sentinel, not ''. */
export function toPosValue(recurringExpenseId: string | null): string {
  return recurringExpenseId ?? TAK_TERDUGA
}
