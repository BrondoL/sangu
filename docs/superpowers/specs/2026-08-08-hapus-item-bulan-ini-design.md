# Removing a generated item from one month — design

2026-08-08

## The question it answers

**This month that bill does not exist. How do I get it off the list without
telling Sangu it never exists again?**

Today only manual rows can be deleted. `components/current/item-row.tsx:64`
hides the trash button behind `item.source_id === null`, so every row that came
from a definition is permanent for that month. The comment there explains the
reasoning — *"generated ones come back next month"* — and it is accurate: a
generated row deleted today is resurrected by the next press of "Sinkron
definisi", because `generateMonth` decides what to create by asking which
`source_id`s are already present in the period.

So the missing piece is not a button. It is a place to record that a definition
was deliberately left out of one month, so that sync stops treating its absence
as an omission to repair.

Two situations want this, and one rule serves both: the item genuinely has no
instance this month (a subscription paused, a bill skipped), or sync produced a
row that should not be there at all. In both cases the item should leave this
month, the definition should stay untouched, and next month should be normal.

## Scope

**In:** deleting a row generated from a recurring expense, an instalment, or a
savings goal; keeping it deleted across repeated syncs of the same month; and a
way back if the deletion was a mistake.

**Out, deliberately:**

- **Credit-card bill rows.** Their `source_id` is `null`, so this mechanism does
  not address them — sync keys them by `account_id`
  (`existingCardBillAccountIds`). Excluding one needs a second, account-shaped
  exclusion, and there is no demand for it yet.
- **Deactivating the definition.** That already exists in Pengaturan and means
  something different: gone from this month *and every month after*.
- **Restoring one excluded item out of several.** Restore clears the whole
  exclusion list for the period. With one or two exclusions in a typical month,
  a per-item restore buys little and costs a name lookup across three
  definition tables.

## Isolation

Nothing that computes a number changes. The four places that read
`monthly_items` — `getItems` in `lib/queries/periods.ts:28`, `getGoalProgress`
in `lib/queries/goals.ts:14`, and the two dashboard queries in
`lib/queries/dashboard.ts:23` and `:66` — are untouched, because an excluded row
is really deleted rather than flagged. There is no filter for a future reader to
forget, and no way for a hidden row to leak into a total.

The new column is read by exactly one function: `generateMonth`.

One shared component is touched: `DeleteButton`, used by the spending and
settings screens as well. The change is additive — a new optional prop with a
default equal to today's behaviour — so no existing caller changes and none of
those screens shift.

## Data model

```sql
-- supabase/migrations/0005_period_exclusions.sql
alter table monthly_periods
  add column excluded_source_ids uuid[] not null default '{}';
```

One column on a table that already has RLS and an `owner_all` policy, so no new
policy and no new index. `getPeriod` already does `select('*')`, so
`app/(app)/current/page.tsx` receives the array without an extra round trip.

`lib/database.types.ts` must be regenerated.

The ids are polymorphic — an entry may name a row in `recurring_expenses`,
`installments`, or `savings_goals` — which is why this is an array of bare uuids
rather than a table with a foreign key. A separate table could not have
constrained them either, and would have cost a migration, an index, and a policy
for nothing.

## Deleting

The condition in `item-row.tsx:64` becomes `item.category !== 'card_bill'`, which
drops the `source_id === null` half. Manual rows are unaffected in practice:
`add-item-dialog.tsx:31` posts `category` as a hidden `expense`, so a manual row
is never a card bill and the new condition admits exactly the same set plus the
generated ones.

The dialog needs different wording, because it now promises something different:

> **Hapus Netflix?**
> Hilang dari bulan ini saja. Definisinya di Pengaturan tidak disentuh, dan
> bulan depan muncul lagi seperti biasa.

`DeleteButton` cannot say that yet. It closes every dialog with a hardcoded
*"Data yang dihapus tidak bisa dikembalikan."* (`components/delete-button.tsx:54`),
which directly contradicts both the promise above and the restore line below. So
the component gains one optional prop:

```ts
consequence?: string   // default: 'Data yang dihapus tidak bisa dikembalikan.'
```

rendered where the fixed sentence is now. Every existing caller — spending,
settings, manual rows — omits it and reads exactly as before; the generated row
passes the month-scoped sentence. The alternative, passing the existing
`description` prop, would have left the contradicting sentence sitting
underneath it.

Confirming does two things: the row is deleted from `monthly_items`, and its
`source_id` is appended to the period's `excluded_source_ids`.

`deleteItem(id)` in `lib/queries/periods.ts:85` grows to cover both. It reads the
row's `period_id` and `source_id` first, deletes the row, and — only when
`source_id` is not null — writes the extended array back to the period,
deduplicated through a `Set` so that a delete → restore → delete cycle does not
accumulate copies.

Its signature stays `(id: string)`. That matters: `DeleteButton` takes
`action: (id) => Promise<ActionState>` and is shared with the spending and
settings screens, so keeping the shape means no caller outside this feature
changes. Manual rows keep their exact current behaviour — `source_id` is null,
so the second step is skipped.

## Restoring

When a period's `excluded_source_ids` is non-empty, a muted line renders below
the item groups:

```
2 item dikecualikan bulan ini · Pulihkan
```

Pressing Pulihkan calls `restoreExcludedAction(periodId, month)` — the page holds
both — which clears the array and then runs `generateMonth` for that month.
The items come back through the ordinary sync path, which means they come back
with their `source_id` intact — the detail that matters, because a savings row
re-added by hand would carry `source_id = null` and stop counting toward goal
progress, which matches on `source_id` at `lib/queries/goals.ts:24`.

Amounts follow the normal sync rules: inherited from the previous month if that
month has the same source, otherwise the definition's default. The amount the
row carried at the moment of deletion is not preserved. This is the accepted
cost of deleting the row outright instead of flagging it, and for an item that
was absent this month anyway there is nothing meaningful to preserve.

## Pure functions

`GenerateInput` in `lib/types.ts:97` gains one field:

```ts
excludedSourceIds: Set<string>   // deliberately left out of the target month
```

and `planNewMonthItems` in `lib/generate.ts:40` opens with:

```ts
const skip = new Set([...existingSourceIds, ...excludedSourceIds])
```

The three definition loops test `skip` instead of `existingSourceIds`. The
credit-card loop is unchanged.

The union lives inside the pure function rather than at the call site in
`periods.ts`. Both are one line, but only one of them can be tested without a
database, and "an excluded definition is not generated" is exactly the rule that
must not quietly regress.

## Files changed

| File | Change |
|---|---|
| `supabase/migrations/0005_period_exclusions.sql` | new — the column |
| `lib/database.types.ts` | regenerated |
| `lib/types.ts` | `excludedSourceIds` on `GenerateInput` |
| `lib/generate.ts` | `skip` set; three loops use it |
| `lib/queries/periods.ts` | `deleteItem` records the exclusion; new `clearExclusions(periodId)`; `generateMonth` passes the array through |
| `app/(app)/current/actions.ts` | new `restoreExcludedAction(periodId, month)` |
| `components/delete-button.tsx` | optional `consequence` prop, defaulting to today's sentence |
| `components/current/item-row.tsx` | condition becomes `item.category !== 'card_bill'`; passes `consequence` |
| `components/current/excluded-note.tsx` | new — the muted line and its button |
| `app/(app)/current/page.tsx` | renders the note when the array is non-empty |
| `lib/generate.test.ts` | exclusion cases |

`clearExclusions` and the restore action call `revalidateMonthViews()` on the
same terms as the existing mutations; `generateMonth` already does.

## Edge cases

**The definition was deactivated after being excluded.** Restore clears the
array and syncs, but the item does not reappear, because `generateMonth` only
reads active definitions. Correct: an inactive definition should not produce
rows. The note disappears, which is honest — there is no longer an exclusion.

**An instalment past its tenor is excluded, then restored.**
`isInstallmentActive` still gates it, so it stays gone. The exclusion is
irrelevant to the outcome and harmless.

**A definition is deleted in Pengaturan while its id sits in the array.** The id
becomes stale and is never cleaned up. It is also never matched, since
`planNewMonthItems` only tests ids that belong to definitions it was handed.
Harmless, and the array is per-period and small.

**Two deletions at once.** `deleteItem` is read-modify-write on the array, so
concurrent deletes could lose one exclusion. Single user, one tab, and every
deletion sits behind a confirmation dialog. Accepted rather than solved with an
RPC; the failure mode is a resurrected row on the next sync, not lost data.

**A month with exclusions but no items.** The empty-state card and the note can
both render. That combination reads correctly: nothing here, and something was
taken out.

## Testing

In `lib/generate.test.ts`, against the pure planner:

- A recurring definition whose id is in `excludedSourceIds` produces no item,
  while its siblings in the same category still do.
- The same id in both `existingSourceIds` and `excludedSourceIds` still produces
  nothing, and no duplicate.
- With the id removed from `excludedSourceIds`, the item is planned again and
  inherits the previous month's amount.
- Exclusions do not affect the credit-card bill loop.

Server actions and components are not tested, matching the repo as it stands.

## Decisions taken

**Really delete, do not flag.** An `is_removed` column on `monthly_items` would
have kept the amount and made undo trivial, but it would have obliged all four
readers of that table to filter, forever. A forgotten filter inflates a
dashboard total silently, with no test standing in the way. A budgeting app can
afford a lost amount; it cannot afford a wrong total.

**Array column, not a table.** `source_id` is polymorphic, so a table gets no
foreign key and no cascade — the two things that would have justified it. What
remained was a migration, an index, and a policy for data that a single column
holds.

**A persistent restore line, not an undo toast.** Sync will not bring an
excluded item back, so the way home has to outlive the toast. Re-adding by hand
is not equivalent: a manual row has no `source_id` and drops out of goal
progress.

## Not in this spec

Excluding a credit-card bill row. Per-item restore. Any change to how
definitions are deactivated. Preserving an excluded row's amount across restore.
