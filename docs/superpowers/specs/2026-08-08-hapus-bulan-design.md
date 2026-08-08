# Undoing a month — design

2026-08-08

## The question it answers

**I opened the wrong month. How do I take it back?**

"Mulai bulan baru" creates a period and fills it from the definitions. There is
no way out of that. Across the whole codebase `monthly_periods` is only ever
selected, inserted or updated — `lib/queries/periods.ts` and
`lib/queries/dashboard.ts` between them never issue a delete. A month pressed
into existence by accident stays in the history, and stays on the dashboard
trend, forever.

The fix is the inverse of the button that caused it: remove the period and
return the page to the state it had before the press.

## Scope

**In:** deleting an opened month in full — its items, balances, actual salary,
note — and returning `/current` for that month to its "belum dibuka" card.

**Out, deliberately:**

- **Resetting items while keeping the month.** A separate idea with a separate
  meaning ("my amounts are a mess, start the list over"). Not asked for, and
  deleting then re-opening reaches almost the same place.
- **Locking the button on months that carry real data.** The dialog reports what
  will be lost instead. A month filled in by mistake is exactly the one you most
  need to remove, so a guard based on "looks touched" would block the main case.
- **Deleting spending.** Money that was actually spent is not part of the plan
  being cancelled. See below.

## What goes, and what stays

One delete on `monthly_periods` is the whole operation. `monthly_items` and
`monthly_balances` both declare `period_id ... on delete cascade`
(`supabase/migrations/0001_init.sql:71` and `:85`), so the items and the account
balances follow without any code. `actual_salary`, `note` and — once the
exclusion feature lands — `excluded_source_ids` live on the period row itself
and go with it.

Nothing else is touched. The definitions in Pengaturan are a separate layer and
are never written by this path. Spending survives too: `spending` and
`budget_months` are keyed by date (`occurred_on`, `month`), not by `period_id`
(`supabase/migrations/0002_budget_control.sql`), so no cascade reaches them.
That is the correct outcome — cancelling a plan should not erase the record of
money that actually left the account.

**One knock-on worth naming.** A new month inherits its amounts from the month
before it. Delete August, then generate September afterwards, and September
finds no August to inherit from and falls back to the definition amounts. A
September that already exists is unaffected, because inheritance is resolved at
generation time and never revisited.

## The affordance

A muted text trigger sits at the foot of `/current`, below the item groups and
below the exclusion note:

```
Hapus Agustus 2026
```

It renders only when the period exists. When it does not, the page is already
showing the "belum dibuka" card and its Mulai bulan baru button — there is
nothing to undo.

The confirmation names what will be lost:

> **Hapus Agustus 2026?**
> 12 item, 3 lunas · gaji riil terisi · saldo 4 rekening · ada catatan
> Semuanya hilang. Definisi di Pengaturan tidak disentuh, dan bulan ini bisa
> dibuka lagi kapan saja.

Afterwards the page returns to the "belum dibuka" card. The month selected in
the MonthPicker does not change, so pressing Mulai bulan baru starts the month
over from the definitions.

`DeleteButton` is reused rather than reimplemented. It already owns the dialog,
the pending state, the toast and the `action: (id) => Promise<ActionState>`
contract, and `id` carries the period id perfectly well. It gains one additive
prop, `triggerLabel?: string`: when set, the trigger renders as a muted text
button instead of the ghost trash icon, and the text is its accessible name. No
existing caller passes it, so the spending and settings screens do not move.

The inventory line goes in the existing `description` prop and the closing
sentence in `consequence`, the prop added by the exclusion feature. Without
`consequence` the dialog would end on *"Data yang dihapus tidak bisa
dikembalikan."*, which is wrong here in a way that matters: the month can be
opened again.

## Pure function

The sentence is assembled by `describePeriodContents` in a new
`lib/period-summary.ts`, because components in this project do not compute.

```ts
export interface PeriodContents {
  itemCount: number
  paidCount: number
  balanceCount: number
  hasActualSalary: boolean
  hasNote: boolean
}

export function describePeriodContents(contents: PeriodContents): string
```

Rules:

- An empty part is not written. A month with no note says nothing about notes.
- `paidCount` is folded into the item clause and only when it is above zero —
  `12 item`, never `12 item, 0 lunas`.
- Parts join with ` · `, matching the separator the app already uses in
  `item-row.tsx`.
- When every part is empty the sentence is `bulan ini masih kosong`.

**Zero counts as empty**, for both the balances and the salary. A balance of
Rp 0 and a salary of Rp 0 carry no information, and counting them would inflate
the warning with things the user never really entered. `page.tsx` therefore
passes `balanceCount` as the number of balance rows whose amount is non-zero,
and `hasActualSalary` as `actual_salary` being both non-null and non-zero. A
note counts when it is non-empty after trimming.

## Files changed

| File | Change |
|---|---|
| `lib/period-summary.ts` | new — `PeriodContents`, `describePeriodContents` |
| `lib/period-summary.test.ts` | new — the sentence rules |
| `lib/queries/periods.ts` | new `deletePeriod(periodId)` |
| `app/(app)/current/actions.ts` | new `deleteMonthAction(periodId)` |
| `components/delete-button.tsx` | optional `triggerLabel` prop |
| `app/(app)/current/page.tsx` | counts the contents, renders the trigger |

No migration. No change to `lib/database.types.ts`.

## Edge cases

**A month with a period but no items.** The trigger still shows — the period row
exists and is what is being deleted. The sentence reads `bulan ini masih
kosong`, or names the salary and balances if those were filled.

**Deleting a past month.** Allowed, by decision. The dashboard trend loses that
point, which is the honest consequence of the month no longer existing.

**Deleting the month currently being generated.** Not reachable: generation is a
server action inside a transition, and the page re-renders from the server
afterwards.

**A stale page whose period was already deleted.** The delete succeeds against
nothing — Supabase reports no error for a delete matching zero rows — and the
revalidation returns the "belum dibuka" card. Correct enough; no special case.

## Testing

`lib/period-summary.test.ts`, against the pure function:

- A full month names all four parts in order, separated by ` · `.
- Items with nothing paid produce `12 item`, with no `lunas` clause.
- A month with only a salary produces only the salary clause.
- A zero balance count and a zero-amount salary are both omitted.
- Everything empty produces `bulan ini masih kosong`.

The query, the action and the components are not tested, matching the repo.

## Decisions taken

**Report, do not restrict.** Locking the trigger behind "the month looks
untouched" would have made the feature useless for the case that actually hurts
— a month opened in error and half filled in before you noticed.

**Reuse `DeleteButton`.** One additive prop against roughly thirty lines of
duplicated AlertDialog scaffolding, and the duplicate would drift from the
original the first time either changed.

**Foot of the page, not the action row.** Tambah item and Sinkron definisi are
pressed often; a destructive control next to them is a misclick waiting to
happen. The foot is out of the way of an ordinary session and still findable
when looked for.

## Not in this spec

Resetting a month's items in place. Any bulk operation across months. Any
change to how spending or budgets are stored.
