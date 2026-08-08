# Taking things back on /current — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Two undo paths the month page never had. A row generated from a definition can be dropped from one month without the next "Sinkron definisi" putting it back (Tasks 1–5), and a month opened by mistake can be removed outright (Tasks 6–7).

**Architecture:** For the row: the deletion is real, and the row's `source_id` is recorded in a new `uuid[]` column on the period. `planNewMonthItems` treats those ids exactly like ids already present in the month, so sync leaves them alone. Nothing that computes a number changes, because there is no hidden row to filter out. A muted line under the item groups clears the column and re-syncs, restoring the rows through the ordinary generation path with their `source_id` intact. For the month: one delete on `monthly_periods`, with items and balances following through the cascades already declared in `0001_init.sql`. Both affordances live at the foot of the page and share `DeleteButton`, which gains two additive props.

**Tech Stack:** Next.js 16 (App Router, server actions), React 19, Supabase (Postgres + RLS), TypeScript, Vitest, Tailwind v4, shadcn/radix, sonner.

**Specs:**
- Tasks 1–5: `docs/superpowers/specs/2026-08-08-hapus-item-bulan-ini-design.md`
- Tasks 6–7: `docs/superpowers/specs/2026-08-08-hapus-bulan-design.md`
- Task 8 verifies both.

## Global Constraints

- **All amounts are integer rupiah.** Never floats. Formatted only at the UI edge.
- **No calculation in components.** Numbers come from pure functions in `lib/` that never touch the database.
- **RLS on every table**, policy `user_id = auth.uid()`. `monthly_periods` already has `owner_all`, so the new column needs no policy.
- **All user-facing copy is Indonesian.** Code, comments, and commit messages are English.
- **Commit messages** are a lowercase declarative sentence after the type, in the style of `feat: note suggestions filter as you type, ranked by how often used`. Every commit ends with the `Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>` trailer.
- **Tests** run with `npm test` (Vitest, `vitest run`). Lint is `npm run lint`, build is `npm run build`.
- **This branch is not shippable until Task 5 lands.** Task 4 exposes the delete button; Task 5 adds the only way back. Do not stop between them.
- **Task 7 depends on Task 4.** It passes the `consequence` prop that Task 4 adds to `DeleteButton`. Without it the month dialog ends on "Data yang dihapus tidak bisa dikembalikan.", which is false — the month can be opened again.

---

## File Structure

| File | Responsibility |
|---|---|
| `supabase/migrations/0005_period_exclusions.sql` | *new* — the `excluded_source_ids` column |
| `lib/database.types.ts` | *modify* — the column in `monthly_periods` Row/Insert/Update |
| `lib/types.ts:97` | *modify* — `excludedSourceIds` on `GenerateInput` |
| `lib/generate.ts:28` | *modify* — one `skip` set the three definition loops share |
| `lib/generate.test.ts` | *modify* — the exclusion rules |
| `lib/period-summary.ts` | *new* — the sentence describing what a month holds |
| `lib/period-summary.test.ts` | *new* — its rules |
| `lib/queries/periods.ts` | *modify* — `generateMonth` reads the column; `deleteItem` writes it; new `clearExclusions`; new `deletePeriod` |
| `app/(app)/current/actions.ts` | *modify* — `restoreExcludedAction`, `deleteMonthAction` |
| `components/delete-button.tsx` | *modify* — optional `consequence` and `triggerLabel` props |
| `components/current/item-row.tsx` | *modify* — show the button on generated rows, with month-scoped wording |
| `components/current/excluded-note.tsx` | *new* — the muted line and its restore button |
| `app/(app)/current/page.tsx` | *modify* — render the note and the month-delete trigger |
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

## Task 6: The sentence describing what a month holds

Spec: `docs/superpowers/specs/2026-08-08-hapus-bulan-design.md`. The confirmation for deleting a month names what will be lost. Components in this project do not compute, so the sentence is a pure function — which also makes every branch of it testable.

**Files:**
- Create: `lib/period-summary.ts`
- Create: `lib/period-summary.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `PeriodContents` (`{ itemCount: number; paidCount: number; balanceCount: number; hasActualSalary: boolean; hasNote: boolean }`) and `describePeriodContents(contents: PeriodContents): string`. Task 7 calls it from `page.tsx`.

- [ ] **Step 1: Write the failing tests**

Create `lib/period-summary.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { describePeriodContents } from './period-summary'
import type { PeriodContents } from './period-summary'

const nothing: PeriodContents = {
  itemCount: 0,
  paidCount: 0,
  balanceCount: 0,
  hasActualSalary: false,
  hasNote: false,
}

describe('describePeriodContents', () => {
  it('names every part of a full month, separated by a middle dot', () => {
    expect(
      describePeriodContents({
        itemCount: 12,
        paidCount: 3,
        balanceCount: 4,
        hasActualSalary: true,
        hasNote: true,
      })
    ).toBe('12 item, 3 lunas · gaji riil terisi · saldo 4 rekening · ada catatan')
  })

  it('leaves out the lunas clause when nothing is paid', () => {
    expect(describePeriodContents({ ...nothing, itemCount: 12 })).toBe('12 item')
  })

  it('names only the parts that are there', () => {
    expect(describePeriodContents({ ...nothing, hasActualSalary: true })).toBe(
      'gaji riil terisi'
    )
  })

  it('omits a zero balance count', () => {
    expect(
      describePeriodContents({ ...nothing, itemCount: 5, balanceCount: 0 })
    ).toBe('5 item')
  })

  it('says the month is empty when there is nothing at all', () => {
    expect(describePeriodContents(nothing)).toBe('bulan ini masih kosong')
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- period-summary`
Expected: FAIL — the file `./period-summary` does not exist, so the suite cannot be collected.

- [ ] **Step 3: Write the implementation**

Create `lib/period-summary.ts`:

```ts
export interface PeriodContents {
  itemCount: number
  paidCount: number
  balanceCount: number
  hasActualSalary: boolean
  hasNote: boolean
}

/**
 * What a month is holding, in one line, for the dialog that offers to delete
 * it. Empty parts are not written: a month with no note says nothing about
 * notes, so the sentence never pads itself with things that are not there.
 */
export function describePeriodContents(contents: PeriodContents): string {
  const { itemCount, paidCount, balanceCount, hasActualSalary, hasNote } =
    contents
  const parts: string[] = []

  if (itemCount > 0) {
    parts.push(
      paidCount > 0 ? `${itemCount} item, ${paidCount} lunas` : `${itemCount} item`
    )
  }
  if (hasActualSalary) parts.push('gaji riil terisi')
  if (balanceCount > 0) parts.push(`saldo ${balanceCount} rekening`)
  if (hasNote) parts.push('ada catatan')

  return parts.length === 0 ? 'bulan ini masih kosong' : parts.join(' · ')
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- period-summary`
Expected: PASS, all five.

- [ ] **Step 5: Commit**

```bash
git add lib/period-summary.ts lib/period-summary.test.ts
git commit -m "$(cat <<'EOF'
feat: say what a month is holding before offering to drop it

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Deleting the month

Spec: `docs/superpowers/specs/2026-08-08-hapus-bulan-design.md`.

**Files:**
- Modify: `lib/queries/periods.ts`
- Modify: `app/(app)/current/actions.ts`
- Modify: `components/delete-button.tsx`
- Modify: `app/(app)/current/page.tsx`

**Interfaces:**
- Consumes: `describePeriodContents` (Task 6); the `consequence` prop on `DeleteButton` (Task 4).
- Produces: `deletePeriod(periodId: string): Promise<void>`; `deleteMonthAction(periodId: string): Promise<ActionState>`; `DeleteButton` gains `triggerLabel?: string`.

- [ ] **Step 1: Add the query**

In `lib/queries/periods.ts`, after `clearExclusions`, add a new section. One statement is the entire operation — `monthly_items` and `monthly_balances` both declare `on delete cascade` on `period_id`:

```ts
// --- Undoing a month ---

/**
 * Removes the period itself. monthly_items and monthly_balances follow through
 * the cascades declared in 0001_init.sql, and actual_salary, note and
 * excluded_source_ids live on this row. Spending and budget history are keyed
 * by date rather than period_id, so they are deliberately out of reach.
 */
export async function deletePeriod(periodId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('monthly_periods')
    .delete()
    .eq('id', periodId)
  if (error) throw error
  revalidateMonthViews()
}
```

- [ ] **Step 2: Add the action**

In `app/(app)/current/actions.ts`, add `deletePeriod` to the import list from `@/lib/queries/periods`, then add the action after `restoreExcludedAction`:

```ts
export async function deleteMonthAction(periodId: string): Promise<ActionState> {
  try {
    await deletePeriod(periodId)
    return { ok: true }
  } catch (e) {
    return fail(e)
  }
}
```

- [ ] **Step 3: Let `DeleteButton` render as text**

The month trigger is a sentence at the foot of a page, not an icon in a row. In `components/delete-button.tsx`, add the prop to the type, after `consequence`:

```ts
  /**
   * Renders the trigger as a muted text button carrying this label, instead of
   * the ghost trash icon. For a trigger that stands alone rather than sitting
   * at the end of a row, where an icon would have nothing to be read against.
   */
  triggerLabel?: string
```

Add `triggerLabel` to the destructured parameters, then replace the trigger:

```tsx
      <AlertDialogTrigger asChild>
        {triggerLabel ? (
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground h-auto p-0 text-xs font-normal underline underline-offset-2"
          >
            {triggerLabel}
          </Button>
        ) : (
          <Button variant="ghost" size="icon" aria-label={`Hapus ${named}`}>
            <Trash2 className="size-4" />
          </Button>
        )}
      </AlertDialogTrigger>
```

The text trigger needs no `aria-label` — its own text is the accessible name.

- [ ] **Step 4: Render it on the page**

In `app/(app)/current/page.tsx`, add two imports:

```tsx
import { DeleteButton } from '@/components/delete-button'
import { describePeriodContents } from '@/lib/period-summary'
```

and add `deleteMonthAction` to the existing import from `@/app/(app)/current/actions` — or add that import line if the page does not have one yet.

Below the `const total = ...` line, compute the contents. Zero counts as empty for both the salary and the balances: a Rp 0 balance was never really entered, and counting it would pad the warning.

```tsx
  const monthLabel = formatMonthLabel(month)
  const contents = describePeriodContents({
    itemCount: items.length,
    paidCount: items.filter((i) => i.is_paid).length,
    balanceCount: balances.filter((b) => b.balance !== 0).length,
    hasActualSalary: period.actual_salary !== null && period.actual_salary !== 0,
    hasNote: (period.note ?? '').trim() !== '',
  })
```

Then render the trigger at the very foot, directly after the `ExcludedNote` block added in Task 5:

```tsx
      {period.excluded_source_ids.length > 0 && (
        <ExcludedNote
          periodId={period.id}
          month={month}
          count={period.excluded_source_ids.length}
        />
      )}

      {/* Foot of the page on purpose: Tambah item and Sinkron definisi are
          pressed often, and this is not something to have next to them. */}
      <div className="px-1">
        <DeleteButton
          id={period.id}
          label={monthLabel}
          triggerLabel={`Hapus ${monthLabel}`}
          description={contents}
          consequence="Semuanya hilang. Definisi di Pengaturan tidak disentuh, dan bulan ini bisa dibuka lagi kapan saja."
          action={deleteMonthAction}
        />
      </div>
```

This whole block sits inside the branch that renders when `period` exists, so a month that was never opened shows the "belum dibuka" card and nothing else.

- [ ] **Step 5: Verify**

Run: `npm test`
Expected: PASS.

Run: `npm run lint && npm run build`
Expected: no lint issues, build succeeds.

- [ ] **Step 6: Commit**

```bash
git add lib/queries/periods.ts "app/(app)/current/actions.ts" components/delete-button.tsx "app/(app)/current/page.tsx"
git commit -m "$(cat <<'EOF'
feat: a month opened by mistake can be taken back

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: Verify in the browser and record it

Every rule these two features depend on lives in the database round trip, which no test in this repo covers. `docs/PROGRESS.md` is candid that write paths have historically shipped unclicked; these should not.

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

- [ ] **Step 2: Walk the row feature in a running app**

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

- [ ] **Step 3: Walk the month deletion — on a throwaway month**

**Do this on a month you are willing to lose.** Deleting is real and reaches live data. Use the MonthPicker to move to a month far from the one in use — a future month works well — and press **Mulai bulan baru** to open it. Then:

1. *"Hapus <bulan>"* appears at the foot of the page, below the groups, as muted text rather than an icon.
2. Its dialog names the contents. On a freshly opened month that is the item count with no `lunas` clause; fill in the actual salary and a note, reload, and those parts appear too.
3. The dialog's closing line is *"Semuanya hilang. Definisi di Pengaturan tidak disentuh…"* — **not** *"Data yang dihapus tidak bisa dikembalikan."*
4. Confirming returns the page to the *"<bulan> belum dibuka"* card with its Mulai bulan baru button. The MonthPicker still shows the same month.
5. Pressing **Mulai bulan baru** opens it again from the definitions.
6. Open Pengaturan: every definition is untouched.
7. Open Belanja: recorded spending is untouched — it is keyed by date, not by the period.
8. Open Dashboard: the deleted month is gone from the trend, and no other month moved.
9. Move to a month that was never opened: the "belum dibuka" card shows, and there is no *"Hapus …"* trigger to press.

If any step disagrees, stop and fix it before writing anything down.

- [ ] **Step 4: Record it**

Add a dated section to `docs/PROGRESS.md` in the style of the existing ones: both features, that the exclusion column is what makes a row deletion survive sync and that the cascades in `0001_init.sql` are what make the month deletion one statement, which of the eighteen checks above were actually performed in a browser and which were not, and the `npm test` count at this commit.

- [ ] **Step 5: Commit**

```bash
git add docs/PROGRESS.md
git commit -m "$(cat <<'EOF'
docs: the two undo paths, and what was clicked to prove them

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Spec coverage

### `2026-08-08-hapus-item-bulan-ini-design.md`

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

### `2026-08-08-hapus-bulan-design.md`

| Spec section | Task |
|---|---|
| What goes, and what stays — one delete, the cascades carry the rest | 7, step 1 |
| The affordance — muted text trigger at the foot, the dialog's three lines | 7, steps 3 and 4 |
| Reusing `DeleteButton` — the `triggerLabel` prop | 7, step 3 |
| Pure function — `describePeriodContents` and its rules | 6 |
| Zero counts as empty for salary and balances | 7, step 4 — the `!== 0` filters |
| Testing — the five sentence cases | 6, step 1 |
| Edge: a period with no items | 6 — `bulan ini masih kosong`; 8, step 3 check 2 |
| Edge: a month never opened has no trigger | 7, step 4 — inside the `period` branch; 8, step 3 check 9 |
| Edge: deleting a past month is allowed | no code — no guard is written |
| Edge: stale page, period already gone | no code — a delete matching zero rows is not an error |
| Knock-on: next month loses its inheritance source | no code — documented in the spec |
| Out of scope: resetting items in place, bulk operations, spending | not implemented, by design |
