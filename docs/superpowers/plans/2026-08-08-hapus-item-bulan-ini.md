# Removing a generated item from one month — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a row generated from a definition be deleted from a single month, without the next "Sinkron definisi" putting it back, and with a way to undo.

**Architecture:** The deleted row is really deleted; its `source_id` is recorded in a new `uuid[]` column on the period it belonged to. `planNewMonthItems` treats those ids exactly like ids already present in the month, so sync leaves them alone. Nothing that computes a number changes, because there is no hidden row to filter out. A muted line under the item groups clears the column and re-syncs, which brings the rows back through the ordinary generation path with their `source_id` intact.

**Tech Stack:** Next.js 16 (App Router, server actions), React 19, Supabase (Postgres + RLS), TypeScript, Vitest, Tailwind v4, shadcn/radix, sonner.

**Spec:** `docs/superpowers/specs/2026-08-08-hapus-item-bulan-ini-design.md`

## Global Constraints

- **All amounts are integer rupiah.** Never floats. Formatted only at the UI edge.
- **No calculation in components.** Numbers come from pure functions in `lib/` that never touch the database.
- **RLS on every table**, policy `user_id = auth.uid()`. `monthly_periods` already has `owner_all`, so the new column needs no policy.
- **All user-facing copy is Indonesian.** Code, comments, and commit messages are English.
- **Commit messages** are a lowercase declarative sentence after the type, in the style of `feat: note suggestions filter as you type, ranked by how often used`. Every commit ends with the `Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>` trailer.
- **Tests** run with `npm test` (Vitest, `vitest run`). Lint is `npm run lint`, build is `npm run build`.
- **This branch is not shippable until Task 5 lands.** Task 4 exposes the delete button; Task 5 adds the only way back. Do not stop between them.

---

## File Structure

| File | Responsibility |
|---|---|
| `supabase/migrations/0005_period_exclusions.sql` | *new* — the `excluded_source_ids` column |
| `lib/database.types.ts` | *modify* — the column in `monthly_periods` Row/Insert/Update |
| `lib/types.ts:97` | *modify* — `excludedSourceIds` on `GenerateInput` |
| `lib/generate.ts:28` | *modify* — one `skip` set the three definition loops share |
| `lib/generate.test.ts` | *modify* — the exclusion rules |
| `lib/queries/periods.ts` | *modify* — `generateMonth` reads the column; `deleteItem` writes it; new `clearExclusions` |
| `app/(app)/current/actions.ts` | *modify* — `restoreExcludedAction` |
| `components/delete-button.tsx` | *modify* — optional `consequence` prop |
| `components/current/item-row.tsx` | *modify* — show the button on generated rows, with month-scoped wording |
| `components/current/excluded-note.tsx` | *new* — the muted line and its restore button |
| `app/(app)/current/page.tsx` | *modify* — render the note |
| `docs/PROGRESS.md` | *modify* — record the feature and what was verified |

---

## Task 1: The database column

The column has to exist before anything can be typed against it.

**Files:**
- Create: `supabase/migrations/0005_period_exclusions.sql`
- Modify: `lib/database.types.ts:213-234`

**Interfaces:**
- Consumes: nothing.
- Produces: `monthly_periods.excluded_source_ids`, typed as `excluded_source_ids: string[]` on Row and `excluded_source_ids?: string[]` on Insert and Update. Tasks 2 and 3 read and write it.

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/0005_period_exclusions.sql`:

```sql
-- A month may deliberately leave out a definition: a subscription is paused, or
-- a sync produced a row that should not be there. Deleting the row is not
-- enough. generateMonth decides what to create by asking which source_ids are
-- already in the period, so an absence reads as an omission to repair and the
-- next sync puts the row straight back. This column is the month's memory of
-- what it left out on purpose.
--
-- The ids are polymorphic — recurring_expenses, installments or savings_goals —
-- so no foreign key is possible, which is also why this is a column and not a
-- table. monthly_periods already carries the owner_all policy from 0001, so
-- there is no new RLS to write.
alter table monthly_periods
  add column excluded_source_ids uuid[] not null default '{}';
```

- [ ] **Step 2: Apply it to the database**

This project has no local Supabase stack — migrations are applied to the remote project by hand. **Confirm with the user before running this**, then apply it either with the Supabase MCP `apply_migration` tool (name: `period_exclusions`) or by pasting the SQL into the Supabase dashboard SQL editor.

Verify with:

```sql
select column_name, data_type, column_default, is_nullable
from information_schema.columns
where table_name = 'monthly_periods' and column_name = 'excluded_source_ids';
```

Expected: one row, `ARRAY`, default `'{}'::uuid[]`, `NO`.

- [ ] **Step 3: Add the column to the generated types**

Edit `lib/database.types.ts` by hand rather than regenerating the whole file — it is three lines, and a full regeneration produces a diff that hides them. Keys are alphabetical, so each goes directly after `actual_salary`.

In `Row` (line 214):

```ts
        Row: {
          actual_salary: number | null
          excluded_source_ids: string[]
          id: string
```

In `Insert` (line 221):

```ts
        Insert: {
          actual_salary?: number | null
          excluded_source_ids?: string[]
          id?: string
```

In `Update` (line 228):

```ts
        Update: {
          actual_salary?: number | null
          excluded_source_ids?: string[]
          id?: string
```

- [ ] **Step 4: Verify the project still type-checks**

Run: `npm run build`
Expected: build succeeds. Nothing reads the column yet, so this only proves the type edit is well-formed.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/0005_period_exclusions.sql lib/database.types.ts
git commit -m "$(cat <<'EOF'
feat: a month remembers which definitions it left out

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: The planner honours exclusions

The rule that must never regress: an excluded definition is not generated. It lives in the pure planner so a test can hold it without a database.

**Files:**
- Modify: `lib/types.ts:97-106`
- Modify: `lib/generate.ts:28-96`
- Modify: `lib/generate.test.ts:5-15` (the `empty` helper) and the `planNewMonthItems` describe block
- Modify: `lib/queries/periods.ts:144-165` and `:220-250`

**Interfaces:**
- Consumes: `monthly_periods.excluded_source_ids` from Task 1.
- Produces: `GenerateInput.excludedSourceIds: Set<string>`. Task 3's `restoreExcludedAction` depends on `generateMonth` reading it.

- [ ] **Step 1: Write the failing tests**

Add `excludedSourceIds: new Set(),` to the `empty` helper in `lib/generate.test.ts` so it sits alongside `existingSourceIds`:

```ts
const empty = (over: Partial<GenerateInput>): GenerateInput => ({
  targetMonth: '2026-08-01',
  recurringExpenses: [],
  installments: [],
  savingsGoals: [],
  creditCardAccountIds: [],
  previousItems: null,
  existingSourceIds: new Set(),
  existingCardBillAccountIds: new Set(),
  excludedSourceIds: new Set(),
  ...over,
})
```

Then add these five tests at the end of the `describe('planNewMonthItems', ...)` block, before its closing `})`:

```ts
  it('skips a recurring definition the month excluded, and only that one', () => {
    const items = planNewMonthItems(
      empty({
        recurringExpenses: [
          { id: 'r1', name: 'Netflix', defaultAmount: 54_000, accountId: 'a', paymentMethod: 'debit' },
          { id: 'r2', name: 'Listrik', defaultAmount: 300_000, accountId: 'a', paymentMethod: 'debit' },
        ],
        excludedSourceIds: new Set(['r1']),
      })
    )
    expect(items.map((i) => i.name)).toEqual(['Listrik'])
  })

  it('skips excluded instalments and savings goals too', () => {
    const items = planNewMonthItems(
      empty({
        installments: [
          { id: 'i1', name: 'Motor', monthlyAmount: 1_000_000, tenorMonths: 12, startMonth: '2026-01-01', accountId: 'a', paymentMethod: 'debit' },
        ],
        savingsGoals: [
          { id: 's1', name: 'Dana darurat', monthlyAmount: 500_000, accountId: 'a' },
        ],
        excludedSourceIds: new Set(['i1', 's1']),
      })
    )
    expect(items).toHaveLength(0)
  })

  it('plans nothing, and nothing twice, when an id is both present and excluded', () => {
    const items = planNewMonthItems(
      empty({
        recurringExpenses: [
          { id: 'r1', name: 'Listrik', defaultAmount: 300_000, accountId: 'a', paymentMethod: 'debit' },
        ],
        existingSourceIds: new Set(['r1']),
        excludedSourceIds: new Set(['r1']),
      })
    )
    expect(items).toHaveLength(0)
  })

  it('plans the item again once the exclusion is lifted, inheriting the real amount', () => {
    const items = planNewMonthItems(
      empty({
        recurringExpenses: [
          { id: 'r1', name: 'Netflix', defaultAmount: 54_000, accountId: 'a', paymentMethod: 'debit' },
        ],
        previousItems: [{ sourceType: 'recurring', sourceId: 'r1', amount: 61_000 }],
        excludedSourceIds: new Set(),
      })
    )
    expect(items).toHaveLength(1)
    expect(items[0].amount).toBe(61_000)
  })

  it('leaves card bills alone — they are keyed by account, not by a source id', () => {
    const items = planNewMonthItems(
      empty({
        creditCardAccountIds: ['mandiri'],
        excludedSourceIds: new Set(['mandiri']),
      })
    )
    expect(items.filter((i) => i.category === 'card_bill')).toHaveLength(1)
  })
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- generate`
Expected: FAIL — four of the five new tests. The first reports `['Netflix', 'Listrik']` where `['Listrik']` was expected; the next two get length 1 where 0 was expected; the card-bill guard passes already, because nothing has ever excluded a card bill.

Vitest transpiles without type-checking, so `excludedSourceIds` being absent from `GenerateInput` is not an error here — the property is simply carried along and ignored. The type gets checked by `npm run build` in step 7.

- [ ] **Step 3: Add the field to `GenerateInput`**

In `lib/types.ts`, add the last line of this block:

```ts
export interface GenerateInput {
  targetMonth: string // 'YYYY-MM-01'
  recurringExpenses: RecurringDef[]
  installments: InstallmentDef[]
  savingsGoals: SavingDef[]
  creditCardAccountIds: string[]
  previousItems: PreviousItem[] | null
  existingSourceIds: Set<string>       // recurring/installment/saving already in target month
  existingCardBillAccountIds: Set<string>
  excludedSourceIds: Set<string>       // deliberately left out of the target month
}
```

Nothing changes at runtime. This step exists so the tests written in step 1 describe a shape the compiler agrees with.

- [ ] **Step 4: Make the planner read it**

In `lib/generate.ts`, add `excludedSourceIds` to the destructure and introduce `skip` right above `const items`:

```ts
  const {
    targetMonth,
    recurringExpenses,
    installments,
    savingsGoals,
    creditCardAccountIds,
    previousItems,
    existingSourceIds,
    existingCardBillAccountIds,
    excludedSourceIds,
  } = input

  // Already in the month, or deliberately left out of it. The planner treats
  // both the same way: not mine to create.
  const skip = new Set([...existingSourceIds, ...excludedSourceIds])

  const items: PlannedItem[] = []
```

Then change the guard in each of the three definition loops from `existingSourceIds` to `skip`:

```ts
  for (const r of recurringExpenses) {
    if (skip.has(r.id)) continue
```

```ts
  for (const i of installments) {
    if (skip.has(i.id)) continue
```

```ts
  for (const s of savingsGoals) {
    if (skip.has(s.id)) continue
```

The credit-card loop keeps `existingCardBillAccountIds` untouched.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test -- generate`
Expected: PASS, every test in the file — the five new ones and the existing `is idempotent` test, which must not have moved.

- [ ] **Step 6: Feed the column into the planner**

`generateMonth` in `lib/queries/periods.ts` currently keeps only the period's id. It needs the row. Replace the block at `:149-165`:

```ts
  const { data: found, error: findErr } = await supabase
    .from('monthly_periods')
    .select('id, excluded_source_ids')
    .eq('month', iso)
    .maybeSingle()
  if (findErr) throw findErr

  let period = found
  if (!period) {
    const { data: created, error: createErr } = await supabase
      .from('monthly_periods')
      .insert({ month: iso })
      .select('id, excluded_source_ids')
      .single()
    if (createErr) throw createErr
    period = created
  }
  const periodId = period.id
```

Then in the `planNewMonthItems({ ... })` call, add the field after `existingCardBillAccountIds`:

```ts
    existingSourceIds,
    existingCardBillAccountIds,
    excludedSourceIds: new Set(period.excluded_source_ids),
  })
```

- [ ] **Step 7: Verify the whole suite and the build**

Run: `npm test`
Expected: PASS, every file, with five more tests than before this task. Note the totals — Task 6 records them.

Run: `npm run build`
Expected: succeeds. This is the first step that type-checks, so it is what proves the `GenerateInput` change and the `period` restructure are sound.

- [ ] **Step 8: Commit**

```bash
git add lib/types.ts lib/generate.ts lib/generate.test.ts lib/queries/periods.ts
git commit -m "$(cat <<'EOF'
feat: sync leaves alone what the month left out on purpose

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Deleting records the exclusion, and a way to clear it

**Files:**
- Modify: `lib/queries/periods.ts:85-90`
- Modify: `app/(app)/current/actions.ts`

**Interfaces:**
- Consumes: `excluded_source_ids` (Task 1); `generateMonth` reading it (Task 2).
- Produces: `deleteItem(id: string): Promise<void>` — unchanged signature, new behaviour. `clearExclusions(periodId: string): Promise<void>`. `restoreExcludedAction(periodId: string, month: string): Promise<ActionState>` — Task 5's component calls it.

- [ ] **Step 1: Teach `deleteItem` to remember**

Replace `deleteItem` in `lib/queries/periods.ts`:

```ts
export async function deleteItem(id: string) {
  const supabase = await createClient()

  // Read before deleting. A generated row's source_id has to be remembered on
  // the period, or the next sync reads its absence as an omission and puts the
  // row straight back.
  const { data: item, error: readErr } = await supabase
    .from('monthly_items')
    .select('period_id, source_id')
    .eq('id', id)
    .single()
  if (readErr) throw readErr

  const { error } = await supabase.from('monthly_items').delete().eq('id', id)
  if (error) throw error

  if (item.source_id) {
    const { data: period, error: periodErr } = await supabase
      .from('monthly_periods')
      .select('excluded_source_ids')
      .eq('id', item.period_id)
      .single()
    if (periodErr) throw periodErr

    // Deduped: delete, restore, delete again must not stack copies of one id.
    const next = [...new Set([...period.excluded_source_ids, item.source_id])]
    const { error: writeErr } = await supabase
      .from('monthly_periods')
      .update({ excluded_source_ids: next })
      .eq('id', item.period_id)
    if (writeErr) throw writeErr
  }

  revalidateMonthViews()
}
```

Manual rows have `source_id === null`, so they skip the second half and behave exactly as before.

- [ ] **Step 2: Add `clearExclusions`**

Directly below `deleteItem`, still inside the item-mutations section:

```ts
export async function clearExclusions(periodId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('monthly_periods')
    .update({ excluded_source_ids: [] })
    .eq('id', periodId)
  if (error) throw error
  revalidateMonthViews()
}
```

- [ ] **Step 3: Add the restore action**

In `app/(app)/current/actions.ts`, add `clearExclusions` to the import list from `@/lib/queries/periods`, then add the action after `deleteItemAction`:

```ts
export async function restoreExcludedAction(
  periodId: string,
  month: string
): Promise<ActionState> {
  try {
    await clearExclusions(periodId)
    await generateMonth(month)
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}
```

Clearing first and syncing second is the whole trick: the planner sees an empty exclusion list and rebuilds the missing rows with their `source_id` intact.

- [ ] **Step 4: Verify**

Run: `npm test`
Expected: PASS. No test covers these — they touch the database — but nothing may break.

Run: `npm run lint && npm run build`
Expected: no lint issues, build succeeds.

- [ ] **Step 5: Commit**

```bash
git add lib/queries/periods.ts "app/(app)/current/actions.ts"
git commit -m "$(cat <<'EOF'
feat: deleting a generated row records it against the month

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: The delete button on generated rows

**Files:**
- Modify: `components/delete-button.tsx:20-56`
- Modify: `components/current/item-row.tsx:63-66`

**Interfaces:**
- Consumes: `deleteItemAction` (already imported in `item-row.tsx`), the new `deleteItem` behaviour from Task 3.
- Produces: `DeleteButton` gains `consequence?: string`, default `'Data yang dihapus tidak bisa dikembalikan.'`. Every existing caller — spending rows, settings lists — omits it and is unaffected.

- [ ] **Step 1: Make the consequence sentence overridable**

`DeleteButton` hardcodes *"Data yang dihapus tidak bisa dikembalikan."* at line 54. On a generated row that is false, and it would sit directly under a dialog promising the opposite.

In `components/delete-button.tsx`, add the prop to the type, after `description`:

```ts
  /**
   * What confirming actually costs. Deletion is normally final, which is the
   * default. A generated row on a month is the exception: it comes back next
   * month on its own, and can be restored into this one.
   */
  consequence?: string
```

Add it to the destructured parameters with its default:

```ts
export function DeleteButton({
  id,
  label,
  description,
  consequence = 'Data yang dihapus tidak bisa dikembalikan.',
  action,
}: {
```

And render it in place of the literal:

```tsx
          <AlertDialogDescription>
            {description && (
              <span className="text-foreground mb-1 block">{description}</span>
            )}
            {consequence}
          </AlertDialogDescription>
```

- [ ] **Step 2: Show the button on generated rows**

In `components/current/item-row.tsx`, replace the block at lines 63-66:

```tsx
      {/* Card bills are keyed by account rather than by a definition, so the
          exclusion that keeps a deleted row deleted has nothing to record for
          them — they stay undeletable. Manual rows are always 'expense'
          (add-item-dialog posts it as a hidden field), so dropping the old
          source_id check admits exactly the generated rows and nothing else. */}
      {item.category !== 'card_bill' && (
        <DeleteButton
          id={item.id}
          label={item.name}
          consequence={
            item.source_id === null
              ? undefined
              : 'Hilang dari bulan ini saja. Definisinya di Pengaturan tidak disentuh, dan bulan depan muncul lagi seperti biasa.'
          }
          action={deleteItemAction}
        />
      )}
```

- [ ] **Step 3: Verify**

Run: `npm test`
Expected: PASS. `components/form-dialog.test.tsx` and `components/submit-button.test.tsx` are the only component tests and neither touches `DeleteButton`.

Run: `npm run lint && npm run build`
Expected: no lint issues, build succeeds.

- [ ] **Step 4: Commit**

```bash
git add components/delete-button.tsx components/current/item-row.tsx
git commit -m "$(cat <<'EOF'
feat: a row from a definition can leave one month

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: The restore line

Without this the previous task is a one-way door. Do not stop before it lands.

**Files:**
- Create: `components/current/excluded-note.tsx`
- Modify: `app/(app)/current/page.tsx:94-114`

**Interfaces:**
- Consumes: `restoreExcludedAction(periodId, month)` from Task 3; `period.excluded_source_ids` from Task 1.
- Produces: `<ExcludedNote periodId={string} month={string} count={number} />`.

- [ ] **Step 1: Write the component**

Create `components/current/excluded-note.tsx`. It follows `components/current/generate-button.tsx` exactly — `useTransition`, a toast on the way out — and is a plain sentence rather than a card, because it is a footnote about what is missing, not a section of the document.

```tsx
'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'
import { restoreExcludedAction } from '@/app/(app)/current/actions'

export function ExcludedNote({
  periodId,
  month,
  count,
}: {
  periodId: string
  month: string
  count: number
}) {
  const [pending, startTransition] = useTransition()

  return (
    <p className="text-muted-foreground px-1 text-xs">
      {count} item dikecualikan bulan ini{' · '}
      <button
        type="button"
        disabled={pending}
        className="hover:text-foreground underline underline-offset-2 disabled:opacity-60"
        onClick={() =>
          startTransition(async () => {
            const result = await restoreExcludedAction(periodId, month)
            if (result && !result.ok) toast.error(result.message)
            else toast.success('Pengecualian dibatalkan')
          })
        }
      >
        {pending ? 'Memulihkan…' : 'Pulihkan'}
      </button>
    </p>
  )
}
```

The toast says the exclusion was lifted rather than that the items are back, because a definition deactivated in the meantime will not return — sync only reads active definitions. That is correct behaviour, and the wording stays true to it.

- [ ] **Step 2: Render it on the page**

In `app/(app)/current/page.tsx`, add the import next to the other `current` imports:

```tsx
import { ExcludedNote } from '@/components/current/excluded-note'
```

Then place the note directly after the `{items.length === 0 ? ... : ...}` block and before the closing `</div>`, so it sits below the groups — and still shows on a month whose items are all gone:

```tsx
      )}

      {period.excluded_source_ids.length > 0 && (
        <ExcludedNote
          periodId={period.id}
          month={month}
          count={period.excluded_source_ids.length}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 3: Verify**

Run: `npm test`
Expected: PASS.

Run: `npm run lint && npm run build`
Expected: no lint issues, build succeeds.

- [ ] **Step 4: Commit**

```bash
git add components/current/excluded-note.tsx "app/(app)/current/page.tsx"
git commit -m "$(cat <<'EOF'
feat: a month says what it left out, and can take it back

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Verify in the browser and record it

Every rule this feature depends on lives in the database round trip, which no test in this repo covers. `docs/PROGRESS.md` is candid that write paths have historically shipped unclicked; this one should not.

**Files:**
- Modify: `docs/PROGRESS.md`

**Interfaces:**
- Consumes: everything above.
- Produces: nothing code depends on.

- [ ] **Step 1: Run the full check**

```bash
npm test && npm run lint && npm run build
```

Expected: all three clean. Record the test count.

- [ ] **Step 2: Walk the feature in a running app**

Run `npm run dev`, log in, open `/current` on a month that has generated rows, and confirm each of these in order:

1. A row under Pengeluaran that came from a definition now shows a trash icon.
2. Its dialog reads *"Hilang dari bulan ini saja…"* — **not** *"Data yang dihapus tidak bisa dikembalikan."*
3. Confirming removes the row, and the group total and "Total kebutuhan" both drop by its amount.
4. Pressing **Sinkron definisi** does **not** bring it back. This is the rule the whole feature exists for.
5. The line *"1 item dikecualikan bulan ini · Pulihkan"* appears below the groups.
6. Pressing **Pulihkan** brings the row back, in its group, with a sensible amount, and the line disappears.
7. Open Pengaturan: the definition is still there, untouched.
8. Delete a **manual** item. Its dialog still reads *"Data yang dihapus tidak bisa dikembalikan."*, it disappears, and no exclusion line appears.
9. A "Tagihan Kartu Kredit" row still has no trash icon.

If any step disagrees, stop and fix it before writing anything down.

- [ ] **Step 3: Record it**

Add a dated section to `docs/PROGRESS.md` in the style of the existing ones: what the feature is, that the exclusion column is what makes a deletion survive sync, which of the nine checks above were actually performed in a browser and which were not, and the `npm test` count at this commit.

- [ ] **Step 4: Commit**

```bash
git add docs/PROGRESS.md
git commit -m "$(cat <<'EOF'
docs: what the exclusion column does, and what was clicked to prove it

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Spec coverage

| Spec section | Task |
|---|---|
| Data model — the column, RLS, regenerated types | 1 |
| Pure functions — `excludedSourceIds`, the `skip` set | 2 |
| Deleting — condition change, the `consequence` prop, recording the id | 3, 4 |
| Restoring — clear then sync, the muted line | 3, 5 |
| Isolation — no calculation query touched | held by 2 and 3 touching only `generateMonth` and `deleteItem` |
| Testing — the four pure cases | 2 (five tests: the card-bill guard was added on top) |
| Edge: deactivated definition | 5, step 1 — toast wording |
| Edge: instalment past tenor | 2 — `isInstallmentActive` still gates it, existing test covers |
| Edge: stale id after a definition is deleted | no code — never matched, documented in the spec |
| Edge: concurrent deletes | no code — accepted in the spec |
| Edge: exclusions with no items | 5, step 2 — the note sits outside the empty-state branch |
| Out of scope: card bills, per-item restore, amount preservation | not implemented, by design |
