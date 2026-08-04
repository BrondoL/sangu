# Budget Control Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Record spending as it happens, hold it against the recurring-expense budget for the month, and after a few months say which budgets need adjusting and which one is missing.

**Architecture:** Three new tables (`tracked_budgets`, `budget_months`, `spending`) that read `recurring_expenses` but never write it, except one confirmed adjustment action. All arithmetic lives in pure, tested functions in `lib/budget.ts`; `lib/queries/spending.ts` holds Supabase access; pages render only. The planner (`lib/calculations.ts`, `lib/generate.ts`, `monthly_*` tables) is not touched.

**Tech Stack:** Next.js 16 (App Router, server components, server actions), Supabase (Postgres + RLS), TypeScript, Vitest, Tailwind v4, Radix UI.

Spec: `docs/superpowers/specs/2026-08-04-budget-control-design.md`

## Global Constraints

- **All amounts are integer rupiah.** Never float. Formatting happens only at the UI edge via `formatRupiah` from `lib/format.ts`.
- **No arithmetic in components.** Every number comes from a pure function in `lib/` that never touches the database.
- **RLS on every new table**, policy `for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())`, matching `supabase/migrations/0001_init.sql:101-113`.
- **Months resolve in `Asia/Jakarta`** using `lib/month.ts`. A "month param" is `'YYYY-MM'`; an "ISO month" is `'YYYY-MM-01'`. No `Date` arithmetic.
- **Do not modify:** `lib/calculations.ts`, `lib/generate.ts`, `lib/goals.ts`, `lib/queries/dashboard.ts`, `app/(app)/dashboard/`, `app/(app)/current/`, `app/(app)/goals/`, or the `monthly_periods` / `monthly_items` / `monthly_balances` tables.
- **Copy is Indonesian.** Uppercase eyebrows are for labels and column heads only, never content. Money figures use the `amount` class (IBM Plex Mono).
- **Commit after every task.** Conventional commits, lowercase, describing the why.

---

### Task 1: Schema and generated types

**Files:**
- Create: `supabase/migrations/0002_budget_control.sql`
- Modify: `lib/database.types.ts` (regenerated wholesale)

**Interfaces:**
- Consumes: nothing.
- Produces: tables `tracked_budgets(user_id, recurring_expense_id, sort_order)`, `budget_months(user_id, recurring_expense_id, month, amount)`, `spending(id, user_id, occurred_on, amount, recurring_expense_id, note, created_at)`. Type helper `Tables<'spending'>` etc. become available from `lib/database.types.ts`.

- [ ] **Step 1: Write the migration file**

Create `supabase/migrations/0002_budget_control.sql`:

```sql
-- Budget control. Reads recurring_expenses; never writes it.

-- Which recurring expenses are followed here. Membership only.
create table tracked_budgets (
  user_id uuid not null references auth.users(id) default auth.uid(),
  recurring_expense_id uuid not null references recurring_expenses(id) on delete cascade,
  sort_order integer not null default 0,
  primary key (user_id, recurring_expense_id)
);

-- What the budget was in a given month, captured the first time the month is
-- seen. Without this, raising a budget rewrites the history that justified
-- raising it.
create table budget_months (
  user_id uuid not null references auth.users(id) default auth.uid(),
  recurring_expense_id uuid not null references recurring_expenses(id) on delete cascade,
  month date not null,
  amount bigint not null,
  primary key (user_id, recurring_expense_id, month)
);

-- One expense, as it happened. A null recurring_expense_id is "tak terduga":
-- deleting a definition must never delete money that was actually spent.
create table spending (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) default auth.uid(),
  occurred_on date not null,
  amount bigint not null check (amount > 0),
  recurring_expense_id uuid references recurring_expenses(id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);
create index spending_by_month on spending (user_id, occurred_on);

alter table tracked_budgets enable row level security;
alter table budget_months   enable row level security;
alter table spending        enable row level security;

do $$
declare t text;
begin
  foreach t in array array['tracked_budgets','budget_months','spending'] loop
    execute format(
      'create policy owner_all on %I for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())',
      t
    );
  end loop;
end $$;
```

- [ ] **Step 2: Apply the migration**

Apply it to project `swuqbwyauxepoeaxrtlk` using the Supabase MCP tool `apply_migration` with name `budget_control` and the SQL above as the query.

- [ ] **Step 3: Verify the tables and policies exist**

Run this through the Supabase MCP tool `execute_sql`:

```sql
select c.relname,
       c.relrowsecurity as rls_on,
       (select count(*) from pg_policies p
         where p.schemaname = 'public' and p.tablename = c.relname) as policies
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('tracked_budgets','budget_months','spending')
order by c.relname;
```

Expected: three rows, `rls_on` true and `policies` = 1 for each.

- [ ] **Step 4: Regenerate the types**

Use the Supabase MCP tool `generate_typescript_types` for project `swuqbwyauxepoeaxrtlk` and write the result over `lib/database.types.ts`.

- [ ] **Step 5: Verify the project still typechecks**

Run: `npx tsc --noEmit`
Expected: `No errors found`. The regenerated file is additive, so nothing existing should break.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/0002_budget_control.sql lib/database.types.ts
git commit -m "feat: tables for budget control

Three tables that read recurring_expenses and never write it. budget_months
snapshots the budget per month so that raising a budget later cannot rewrite
the record that justified raising it."
```

---

### Task 2: `summarizeBudgetMonth`

**Files:**
- Create: `lib/budget.ts`
- Test: `lib/budget.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `interface BudgetLine { id: string; name: string; budget: number; spent: number; remaining: number; over: number; ratio: number | null }`
  - `interface BudgetMonthSummary { lines: BudgetLine[]; unattachedTotal: number; totalBudget: number; totalSpent: number }`
  - `summarizeBudgetMonth(input: { budgets: { id: string; name: string; amount: number }[]; spending: { recurringExpenseId: string | null; amount: number }[] }): BudgetMonthSummary`

- [ ] **Step 1: Write the failing test**

Create `lib/budget.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { summarizeBudgetMonth } from './budget'

describe('summarizeBudgetMonth', () => {
  const budgets = [
    { id: 'jajan', name: 'Jajan', amount: 1_750_000 },
    { id: 'makan', name: 'Makan', amount: 1_000_000 },
    { id: 'reward', name: 'Self Reward Nabil', amount: 0 },
  ]

  it('sums spending per budget and splits remaining from over', () => {
    const s = summarizeBudgetMonth({
      budgets,
      spending: [
        { recurringExpenseId: 'jajan', amount: 1_000_000 },
        { recurringExpenseId: 'jajan', amount: 240_000 },
        { recurringExpenseId: 'makan', amount: 1_180_000 },
      ],
    })
    const jajan = s.lines.find((l) => l.id === 'jajan')!
    expect(jajan.spent).toBe(1_240_000)
    expect(jajan.remaining).toBe(510_000)
    expect(jajan.over).toBe(0)

    const makan = s.lines.find((l) => l.id === 'makan')!
    expect(makan.over).toBe(180_000)
    expect(makan.remaining).toBe(0)
  })

  it('reports a zero budget without dividing by zero', () => {
    const s = summarizeBudgetMonth({
      budgets,
      spending: [{ recurringExpenseId: 'reward', amount: 75_000 }],
    })
    const reward = s.lines.find((l) => l.id === 'reward')!
    expect(reward.spent).toBe(75_000)
    expect(reward.ratio).toBeNull()
    expect(reward.over).toBe(75_000)
  })

  it('keeps unattached spending out of every budget line', () => {
    const s = summarizeBudgetMonth({
      budgets,
      spending: [
        { recurringExpenseId: null, amount: 45_000 },
        { recurringExpenseId: null, amount: 122_000 },
        { recurringExpenseId: 'jajan', amount: 10_000 },
      ],
    })
    expect(s.unattachedTotal).toBe(167_000)
    expect(s.totalSpent).toBe(177_000)
    expect(s.lines.find((l) => l.id === 'jajan')!.spent).toBe(10_000)
  })

  it('keeps a budget with no spending at zero rather than dropping it', () => {
    const s = summarizeBudgetMonth({ budgets, spending: [] })
    expect(s.lines).toHaveLength(3)
    expect(s.lines.every((l) => l.spent === 0)).toBe(true)
    expect(s.totalBudget).toBe(2_750_000)
  })

  it('ignores spending pointing at a budget that is not tracked', () => {
    const s = summarizeBudgetMonth({
      budgets,
      spending: [{ recurringExpenseId: 'listrik', amount: 500_000 }],
    })
    expect(s.lines.every((l) => l.spent === 0)).toBe(true)
    expect(s.unattachedTotal).toBe(0)
    expect(s.totalSpent).toBe(0)
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run lib/budget.test.ts`
Expected: FAIL — cannot find module `./budget`.

- [ ] **Step 3: Write the implementation**

Create `lib/budget.ts`:

```ts
/**
 * Budget control arithmetic. Pure — nothing here touches the database, so all
 * of it is testable. Amounts are integer rupiah throughout.
 */

export interface BudgetLine {
  id: string
  name: string
  budget: number
  spent: number
  remaining: number
  over: number
  /** null when the budget is 0 — there is no ratio to a zero budget. */
  ratio: number | null
}

export interface BudgetMonthSummary {
  lines: BudgetLine[]
  unattachedTotal: number
  totalBudget: number
  totalSpent: number
}

export function summarizeBudgetMonth(input: {
  budgets: { id: string; name: string; amount: number }[]
  spending: { recurringExpenseId: string | null; amount: number }[]
}): BudgetMonthSummary {
  const tracked = new Set(input.budgets.map((b) => b.id))

  const spentBy = new Map<string, number>()
  let unattachedTotal = 0
  for (const s of input.spending) {
    if (s.recurringExpenseId === null) {
      unattachedTotal += s.amount
      continue
    }
    // Spending against an untracked budget belongs to neither column: counting
    // it as unattached would invent an expense the user never called surprise.
    if (!tracked.has(s.recurringExpenseId)) continue
    spentBy.set(
      s.recurringExpenseId,
      (spentBy.get(s.recurringExpenseId) ?? 0) + s.amount
    )
  }

  const lines = input.budgets.map((b) => {
    const spent = spentBy.get(b.id) ?? 0
    return {
      id: b.id,
      name: b.name,
      budget: b.amount,
      spent,
      remaining: Math.max(0, b.amount - spent),
      over: Math.max(0, spent - b.amount),
      ratio: b.amount === 0 ? null : spent / b.amount,
    }
  })

  return {
    lines,
    unattachedTotal,
    totalBudget: input.budgets.reduce((t, b) => t + b.amount, 0),
    totalSpent: lines.reduce((t, l) => t + l.spent, 0) + unattachedTotal,
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run lib/budget.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/budget.ts lib/budget.test.ts
git commit -m "feat: summarise one month of spending against its budgets

A zero budget reports spend with no ratio rather than dividing by zero, and
spending against an untracked budget is dropped rather than counted as a
surprise the user never called one."
```

---

### Task 3: `compareAcrossMonths`

**Files:**
- Modify: `lib/budget.ts`
- Test: `lib/budget.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces:
  - `interface MonthPoint { month: string; budget: number | null; spent: number }`
  - `interface BudgetSeries { id: string; name: string; points: MonthPoint[] }`
  - `compareAcrossMonths(input: { budgets: { id: string; name: string }[]; snapshots: { recurringExpenseId: string; month: string; amount: number }[]; spending: { recurringExpenseId: string | null; month: string; amount: number }[]; months: string[] }): BudgetSeries[]`
  - `months` are `'YYYY-MM'` params, oldest first. `budget: null` marks a month that was never snapshotted — a gap, never a zero.

- [ ] **Step 1: Write the failing test**

Append to `lib/budget.test.ts`:

```ts
import { compareAcrossMonths } from './budget'

describe('compareAcrossMonths', () => {
  const budgets = [{ id: 'jajan', name: 'Jajan' }]
  const months = ['2026-05', '2026-06', '2026-07', '2026-08']

  it('marks a month that was never snapshotted as a gap, not a zero', () => {
    const [series] = compareAcrossMonths({
      budgets,
      snapshots: [
        { recurringExpenseId: 'jajan', month: '2026-05', amount: 1_750_000 },
        { recurringExpenseId: 'jajan', month: '2026-07', amount: 1_750_000 },
      ],
      spending: [{ recurringExpenseId: 'jajan', month: '2026-05', amount: 1_800_000 }],
      months,
    })
    expect(series.points.map((p) => p.budget)).toEqual([
      1_750_000,
      null,
      1_750_000,
      null,
    ])
    expect(series.points[1].spent).toBe(0)
  })

  it('holds the budget that applied then, not the one that applies now', () => {
    const [series] = compareAcrossMonths({
      budgets,
      snapshots: [
        { recurringExpenseId: 'jajan', month: '2026-07', amount: 1_750_000 },
        { recurringExpenseId: 'jajan', month: '2026-08', amount: 2_000_000 },
      ],
      spending: [],
      months,
    })
    expect(series.points[2].budget).toBe(1_750_000)
    expect(series.points[3].budget).toBe(2_000_000)
  })

  it('sums spending per month and keeps months oldest first', () => {
    const [series] = compareAcrossMonths({
      budgets,
      snapshots: months.map((month) => ({
        recurringExpenseId: 'jajan',
        month,
        amount: 1_750_000,
      })),
      spending: [
        { recurringExpenseId: 'jajan', month: '2026-08', amount: 100_000 },
        { recurringExpenseId: 'jajan', month: '2026-08', amount: 40_000 },
        { recurringExpenseId: 'jajan', month: '2026-05', amount: 900_000 },
        { recurringExpenseId: null, month: '2026-08', amount: 500_000 },
      ],
      months,
    })
    expect(series.points.map((p) => p.month)).toEqual(months)
    expect(series.points.map((p) => p.spent)).toEqual([900_000, 0, 0, 140_000])
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run lib/budget.test.ts`
Expected: FAIL — `compareAcrossMonths` is not exported.

- [ ] **Step 3: Write the implementation**

Append to `lib/budget.ts`:

```ts
export interface MonthPoint {
  month: string
  /** null means no snapshot was taken — the month is a gap, not a zero. */
  budget: number | null
  spent: number
}

export interface BudgetSeries {
  id: string
  name: string
  points: MonthPoint[]
}

export function compareAcrossMonths(input: {
  budgets: { id: string; name: string }[]
  snapshots: { recurringExpenseId: string; month: string; amount: number }[]
  spending: { recurringExpenseId: string | null; month: string; amount: number }[]
  months: string[]
}): BudgetSeries[] {
  const key = (id: string, month: string) => `${id} ${month}`

  const budgetAt = new Map(
    input.snapshots.map((s) => [key(s.recurringExpenseId, s.month), s.amount])
  )

  const spentAt = new Map<string, number>()
  for (const s of input.spending) {
    if (s.recurringExpenseId === null) continue
    const k = key(s.recurringExpenseId, s.month)
    spentAt.set(k, (spentAt.get(k) ?? 0) + s.amount)
  }

  return input.budgets.map((b) => ({
    id: b.id,
    name: b.name,
    points: input.months.map((month) => ({
      month,
      budget: budgetAt.get(key(b.id, month)) ?? null,
      spent: spentAt.get(key(b.id, month)) ?? 0,
    })),
  }))
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run lib/budget.test.ts`
Expected: PASS, 8 tests total.

- [ ] **Step 5: Commit**

```bash
git add lib/budget.ts lib/budget.test.ts
git commit -m "feat: line up budget against actual across months

A month with no snapshot comes back as a gap rather than a zero. A month you
forgot to record is not a month you spent nothing, and the difference has to
survive all the way to the screen."
```

---

### Task 4: `suggestAdjustment`

**Files:**
- Modify: `lib/budget.ts`
- Test: `lib/budget.test.ts`

**Interfaces:**
- Consumes: `BudgetSeries` and `MonthPoint` from Task 3.
- Produces:
  - `type Adjustment = { kind: 'ok' } | { kind: 'raise'; amount: number; months: number } | { kind: 'lower'; amount: number; months: number }`
  - `suggestAdjustment(series: BudgetSeries): Adjustment`
  - Rule: consider only points with a snapshot and a budget above zero; take the last four. Fewer than three → `ok`. Over budget in at least three → `raise`. Used 60% or less in all four → `lower`. Amount is the median of those actuals rounded up to the nearest 10.000; if it equals the latest budget, `ok`. `months` is how many points the verdict rests on.

- [ ] **Step 1: Write the failing test**

Append to `lib/budget.test.ts`:

```ts
import { suggestAdjustment } from './budget'

const series = (points: [string, number | null, number][]): BudgetSeries => ({
  id: 'jajan',
  name: 'Jajan',
  points: points.map(([month, budget, spent]) => ({ month, budget, spent })),
})

describe('suggestAdjustment', () => {
  it('suggests raising when over budget in three of the last four months', () => {
    const a = suggestAdjustment(
      series([
        ['2026-05', 1_750_000, 1_800_000],
        ['2026-06', 1_750_000, 1_950_000],
        ['2026-07', 1_750_000, 1_760_000],
        ['2026-08', 1_750_000, 1_900_000],
      ])
    )
    expect(a).toEqual({ kind: 'raise', amount: 1_850_000, months: 4 })
  })

  it('suggests lowering when 60% or less is used four months running', () => {
    const a = suggestAdjustment(
      series([
        ['2026-05', 500_000, 200_000],
        ['2026-06', 500_000, 250_000],
        ['2026-07', 500_000, 180_000],
        ['2026-08', 500_000, 300_000],
      ])
    )
    expect(a).toEqual({ kind: 'lower', amount: 230_000, months: 4 })
  })

  it('says nothing when the months disagree', () => {
    const a = suggestAdjustment(
      series([
        ['2026-05', 1_750_000, 1_800_000],
        ['2026-06', 1_750_000, 1_200_000],
        ['2026-07', 1_750_000, 1_900_000],
        ['2026-08', 1_750_000, 1_500_000],
      ])
    )
    expect(a).toEqual({ kind: 'ok' })
  })

  it('will not rule on fewer than three recorded months', () => {
    const a = suggestAdjustment(
      series([
        ['2026-05', null, 0],
        ['2026-06', null, 0],
        ['2026-07', 1_750_000, 1_900_000],
        ['2026-08', 1_750_000, 1_950_000],
      ])
    )
    expect(a).toEqual({ kind: 'ok' })
  })

  it('ignores gap months rather than reading them as zero spend', () => {
    const a = suggestAdjustment(
      series([
        ['2026-05', 500_000, 200_000],
        ['2026-06', null, 0],
        ['2026-07', 500_000, 250_000],
        ['2026-08', 500_000, 180_000],
      ])
    )
    // Three graded months, all well under, but 'lower' needs four.
    expect(a).toEqual({ kind: 'ok' })
  })

  it('stays quiet when the suggestion is the budget already set', () => {
    const a = suggestAdjustment(
      series([
        ['2026-05', 1_000_000, 1_000_000],
        ['2026-06', 1_000_000, 1_000_000],
        ['2026-07', 1_000_000, 1_000_000],
        ['2026-08', 1_000_000, 1_000_000],
      ])
    )
    expect(a).toEqual({ kind: 'ok' })
  })

  it('skips budgets of zero, which have nothing to be over', () => {
    const a = suggestAdjustment(
      series([
        ['2026-05', 0, 50_000],
        ['2026-06', 0, 60_000],
        ['2026-07', 0, 70_000],
        ['2026-08', 0, 80_000],
      ])
    )
    expect(a).toEqual({ kind: 'ok' })
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run lib/budget.test.ts`
Expected: FAIL — `suggestAdjustment` is not exported.

- [ ] **Step 3: Write the implementation**

Append to `lib/budget.ts`:

```ts
export type Adjustment =
  | { kind: 'ok' }
  | { kind: 'raise'; amount: number; months: number }
  | { kind: 'lower'; amount: number; months: number }

const UNDER_USED = 0.6
const ROUND_TO = 10_000

function median(ns: number[]): number {
  const s = [...ns].sort((a, b) => a - b)
  const mid = Math.floor(s.length / 2)
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2
}

function roundUpTo(n: number, step: number): number {
  return Math.ceil(n / step) * step
}

/**
 * Deliberately dull, and stated on screen next to the verdict. A suggestion you
 * cannot check is a suggestion you cannot trust, and this one changes a real
 * number in the budget.
 */
export function suggestAdjustment(series: BudgetSeries): Adjustment {
  const graded = series.points.filter(
    (p): p is MonthPoint & { budget: number } => p.budget !== null && p.budget > 0
  )
  const recent = graded.slice(-4)
  if (recent.length < 3) return { kind: 'ok' }

  const suggestion = roundUpTo(median(recent.map((p) => p.spent)), ROUND_TO)
  if (suggestion === recent[recent.length - 1].budget) return { kind: 'ok' }

  const over = recent.filter((p) => p.spent > p.budget).length
  if (over >= 3) return { kind: 'raise', amount: suggestion, months: recent.length }

  const under = recent.filter((p) => p.spent <= p.budget * UNDER_USED).length
  if (recent.length === 4 && under === 4) {
    return { kind: 'lower', amount: suggestion, months: recent.length }
  }

  return { kind: 'ok' }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run lib/budget.test.ts`
Expected: PASS, 15 tests total.

- [ ] **Step 5: Commit**

```bash
git add lib/budget.ts lib/budget.test.ts
git commit -m "feat: suggest raising or lowering a budget from its own record

The rule is dull on purpose and gets printed next to the verdict. Fewer than
three recorded months returns no verdict at all — this figure ends up writing
a real budget, so it should refuse to guess."
```

---

### Task 5: `groupUnattached`

**Files:**
- Modify: `lib/budget.ts`
- Test: `lib/budget.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces:
  - `interface NoteGroup { note: string; months: number; total: number; perMonth: { month: string; total: number }[] }`
  - `groupUnattached(input: { spending: { month: string; note: string | null; amount: number }[]; minMonths?: number }): NoteGroup[]`
  - Notes are matched with surrounding whitespace trimmed and case ignored; `note` in the result is the first spelling seen. Entries with no note are skipped. Default `minMonths` is 3. Sorted by total, largest first.

- [ ] **Step 1: Write the failing test**

Append to `lib/budget.test.ts`:

```ts
import { groupUnattached } from './budget'

describe('groupUnattached', () => {
  it('groups a note that recurs across three months', () => {
    const groups = groupUnattached({
      spending: [
        { month: '2026-06', note: 'Laundry', amount: 45_000 },
        { month: '2026-07', note: 'laundry', amount: 50_000 },
        { month: '2026-08', note: '  Laundry  ', amount: 55_000 },
      ],
    })
    expect(groups).toHaveLength(1)
    expect(groups[0].note).toBe('Laundry')
    expect(groups[0].months).toBe(3)
    expect(groups[0].total).toBe(150_000)
    expect(groups[0].perMonth).toEqual([
      { month: '2026-06', total: 45_000 },
      { month: '2026-07', total: 50_000 },
      { month: '2026-08', total: 55_000 },
    ])
  })

  it('drops a note that has not recurred in enough months', () => {
    const groups = groupUnattached({
      spending: [
        { month: '2026-07', note: 'Servis kipas', amount: 122_000 },
        { month: '2026-08', note: 'Servis kipas', amount: 90_000 },
      ],
    })
    expect(groups).toEqual([])
  })

  it('counts months, not entries', () => {
    const groups = groupUnattached({
      spending: [
        { month: '2026-08', note: 'Parkir', amount: 5_000 },
        { month: '2026-08', note: 'Parkir', amount: 5_000 },
        { month: '2026-08', note: 'Parkir', amount: 5_000 },
      ],
    })
    expect(groups).toEqual([])
  })

  it('skips entries with no note at all', () => {
    const groups = groupUnattached({
      spending: [
        { month: '2026-06', note: null, amount: 10_000 },
        { month: '2026-07', note: '   ', amount: 10_000 },
        { month: '2026-08', note: '', amount: 10_000 },
      ],
    })
    expect(groups).toEqual([])
  })

  it('sorts the biggest total first', () => {
    const months = ['2026-06', '2026-07', '2026-08']
    const groups = groupUnattached({
      spending: [
        ...months.map((month) => ({ month, note: 'Laundry', amount: 50_000 })),
        ...months.map((month) => ({ month, note: 'Galon', amount: 120_000 })),
      ],
    })
    expect(groups.map((g) => g.note)).toEqual(['Galon', 'Laundry'])
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run lib/budget.test.ts`
Expected: FAIL — `groupUnattached` is not exported.

- [ ] **Step 3: Write the implementation**

Append to `lib/budget.ts`:

```ts
export interface NoteGroup {
  note: string
  months: number
  total: number
  perMonth: { month: string; total: number }[]
}

const MIN_MONTHS = 3

/**
 * Unattached spending that keeps coming back under the same note is a budget
 * that does not exist yet. Case and padding are ignored so "laundry" and
 * "Laundry" meet; nothing here can make "laundry" meet "cuci baju", which is
 * why the capture form suggests notes already used.
 */
export function groupUnattached(input: {
  spending: { month: string; note: string | null; amount: number }[]
  minMonths?: number
}): NoteGroup[] {
  const minMonths = input.minMonths ?? MIN_MONTHS
  const groups = new Map<
    string,
    { note: string; byMonth: Map<string, number> }
  >()

  for (const s of input.spending) {
    const label = (s.note ?? '').trim()
    if (label === '') continue
    const k = label.toLowerCase()
    const g = groups.get(k) ?? { note: label, byMonth: new Map() }
    g.byMonth.set(s.month, (g.byMonth.get(s.month) ?? 0) + s.amount)
    groups.set(k, g)
  }

  return [...groups.values()]
    .filter((g) => g.byMonth.size >= minMonths)
    .map((g) => {
      const perMonth = [...g.byMonth.entries()]
        .map(([month, total]) => ({ month, total }))
        .sort((a, b) => a.month.localeCompare(b.month))
      return {
        note: g.note,
        months: perMonth.length,
        total: perMonth.reduce((t, m) => t + m.total, 0),
        perMonth,
      }
    })
    .sort((a, b) => b.total - a.total)
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run lib/budget.test.ts`
Expected: PASS, 20 tests total.

- [ ] **Step 5: Run the whole suite and lint**

Run: `npm test && npm run lint`
Expected: all test files pass (71 existing + 20 new = 91), ESLint clean.

- [ ] **Step 6: Commit**

```bash
git add lib/budget.ts lib/budget.test.ts
git commit -m "feat: spot a budget that does not exist yet

A note that keeps returning under its own name across months is the second
half of the goal: not just adjusting budgets, but noticing missing ones."
```

---

### Task 6: Query layer

**Files:**
- Create: `lib/queries/spending.ts`

**Interfaces:**
- Consumes: `createClient` from `lib/supabase/server.ts`, `toIsoMonth` / `shiftMonth` / `toMonthParam` from `lib/month.ts`, table types from `lib/database.types.ts`.
- Produces:
  - `listTrackedBudgets(): Promise<{ id: string; name: string; amount: number }[]>`
  - `listAllRecurringWithTracking(): Promise<{ id: string; name: string; default_amount: number; is_active: boolean; tracked: boolean }[]>`
  - `ensureBudgetSnapshots(month: string): Promise<void>`
  - `listBudgetsForMonth(month: string): Promise<{ id: string; name: string; amount: number }[]>`
  - `getSpendingForMonth(month: string): Promise<Tables<'spending'>[]>`
  - `getSpendingHistory(months: string[]): Promise<{ snapshots: { recurringExpenseId: string; month: string; amount: number }[]; spending: { recurringExpenseId: string | null; month: string; amount: number; note: string | null }[] }>`
  - `listNotes(): Promise<string[]>`
  - `addSpending(input: { occurred_on: string; amount: number; recurring_expense_id: string | null; note: string | null }): Promise<void>`
  - `deleteSpending(id: string): Promise<void>`
  - `setTracked(recurringExpenseId: string, tracked: boolean): Promise<void>`
  - `setBudgetAmount(recurringExpenseId: string, amount: number): Promise<void>`

- [ ] **Step 1: Write the query module**

Create `lib/queries/spending.ts`:

```ts
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { toIsoMonth, toMonthParam, shiftMonth } from '@/lib/month'

function revalidateSpending() {
  revalidatePath('/spending')
  revalidatePath('/spending/riwayat')
}

/** The budgets followed here, with the amount their definition carries now. */
export async function listTrackedBudgets() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('tracked_budgets')
    .select('sort_order, recurring_expenses(id, name, default_amount)')
    .order('sort_order')
  if (error) throw error

  return (data ?? [])
    .filter((r) => r.recurring_expenses !== null)
    .map((r) => ({
      id: r.recurring_expenses!.id,
      name: r.recurring_expenses!.name,
      amount: r.recurring_expenses!.default_amount,
    }))
}

/** Every active recurring expense, flagged with whether it is tracked. */
export async function listAllRecurringWithTracking() {
  const supabase = await createClient()
  const [{ data: recurring, error: rErr }, { data: tracked, error: tErr }] =
    await Promise.all([
      supabase
        .from('recurring_expenses')
        .select('id, name, default_amount, is_active')
        .order('name'),
      supabase.from('tracked_budgets').select('recurring_expense_id'),
    ])
  const error = rErr ?? tErr
  if (error) throw error

  const on = new Set((tracked ?? []).map((t) => t.recurring_expense_id))
  return (recurring ?? []).map((r) => ({ ...r, tracked: on.has(r.id) }))
}

/**
 * Photograph each tracked budget's amount for this month, once. Written on
 * first sight rather than on a schedule, because there is no scheduler — and
 * without it, raising a budget later rewrites the history that justified it.
 */
export async function ensureBudgetSnapshots(month: string) {
  const supabase = await createClient()
  const iso = toIsoMonth(month)

  const [budgets, { data: existing, error }] = await Promise.all([
    listTrackedBudgets(),
    supabase.from('budget_months').select('recurring_expense_id').eq('month', iso),
  ])
  if (error) throw error

  const have = new Set((existing ?? []).map((e) => e.recurring_expense_id))
  const missing = budgets.filter((b) => !have.has(b.id))
  if (missing.length === 0) return

  // ignoreDuplicates: two tabs opening the same month must not race into a
  // primary-key violation.
  const { error: insErr } = await supabase.from('budget_months').upsert(
    missing.map((b) => ({
      recurring_expense_id: b.id,
      month: iso,
      amount: b.amount,
    })),
    { onConflict: 'user_id,recurring_expense_id,month', ignoreDuplicates: true }
  )
  if (insErr) throw insErr
}

/** The month's rows, bounded by an exclusive upper edge so no day is counted twice. */
export async function getSpendingForMonth(month: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('spending')
    .select('*')
    .gte('occurred_on', toIsoMonth(month))
    .lt('occurred_on', toIsoMonth(shiftMonth(month, 1)))
    .order('occurred_on', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function listNotes() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('spending')
    .select('note')
    .not('note', 'is', null)
    .order('created_at', { ascending: false })
    .limit(200)
  if (error) throw error

  const seen = new Set<string>()
  const notes: string[] = []
  for (const r of data ?? []) {
    const label = (r.note ?? '').trim()
    if (label === '' || seen.has(label.toLowerCase())) continue
    seen.add(label.toLowerCase())
    notes.push(label)
  }
  return notes
}

export async function addSpending(input: {
  occurred_on: string
  amount: number
  recurring_expense_id: string | null
  note: string | null
}) {
  const supabase = await createClient()
  const { error } = await supabase.from('spending').insert(input)
  if (error) throw error
  revalidateSpending()
}

export async function deleteSpending(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('spending').delete().eq('id', id)
  if (error) throw error
  revalidateSpending()
}

export async function setTracked(recurringExpenseId: string, tracked: boolean) {
  const supabase = await createClient()
  if (tracked) {
    const { error } = await supabase
      .from('tracked_budgets')
      .upsert(
        { recurring_expense_id: recurringExpenseId },
        { onConflict: 'user_id,recurring_expense_id', ignoreDuplicates: true }
      )
    if (error) throw error
  } else {
    const { error } = await supabase
      .from('tracked_budgets')
      .delete()
      .eq('recurring_expense_id', recurringExpenseId)
    if (error) throw error
  }
  revalidatePath('/settings')
  revalidateSpending()
}

/**
 * The one write this feature makes into the planner's data. Guarded by a
 * confirmation dialog in the UI — nothing changes a budget on one tap.
 */
export async function setBudgetAmount(recurringExpenseId: string, amount: number) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('recurring_expenses')
    .update({ default_amount: amount })
    .eq('id', recurringExpenseId)
  if (error) throw error
  revalidatePath('/settings')
  revalidatePath('/current')
  revalidateSpending()
}
```

- [ ] **Step 2: Add the history query**

Append to `lib/queries/spending.ts`:

```ts
/**
 * The tracked budgets as they stood in `month`, read from the snapshot rather
 * than from the definition. The page has a month picker: without this, opening
 * August in October would hold August's spending against October's budget,
 * which is the exact drift budget_months exists to prevent.
 */
export async function listBudgetsForMonth(month: string) {
  const supabase = await createClient()
  const [tracked, { data: snaps, error }] = await Promise.all([
    listTrackedBudgets(),
    supabase
      .from('budget_months')
      .select('recurring_expense_id, amount')
      .eq('month', toIsoMonth(month)),
  ])
  if (error) throw error

  const snapshot = new Map(
    (snaps ?? []).map((s) => [s.recurring_expense_id, s.amount])
  )
  // A budget tracked only after the month had passed has no snapshot for it;
  // its current amount is then the only figure that exists.
  return tracked.map((b) => ({ ...b, amount: snapshot.get(b.id) ?? b.amount }))
}

/** Snapshots and spending for a window of months, shaped for `lib/budget.ts`. */
export async function getSpendingHistory(months: string[]) {
  const supabase = await createClient()
  const from = toIsoMonth(months[0])
  const toExclusive = toIsoMonth(shiftMonth(months[months.length - 1], 1))

  const [{ data: snaps, error: sErr }, { data: spend, error: pErr }] =
    await Promise.all([
      supabase
        .from('budget_months')
        .select('recurring_expense_id, month, amount')
        .gte('month', from)
        .lt('month', toExclusive),
      supabase
        .from('spending')
        .select('recurring_expense_id, occurred_on, amount, note')
        .gte('occurred_on', from)
        .lt('occurred_on', toExclusive),
    ])
  const error = sErr ?? pErr
  if (error) throw error

  return {
    snapshots: (snaps ?? []).map((s) => ({
      recurringExpenseId: s.recurring_expense_id,
      month: toMonthParam(s.month),
      amount: s.amount,
    })),
    spending: (spend ?? []).map((s) => ({
      recurringExpenseId: s.recurring_expense_id,
      month: toMonthParam(s.occurred_on),
      amount: s.amount,
      note: s.note,
    })),
  }
}
```

- [ ] **Step 3: Verify it typechecks**

Run: `npx tsc --noEmit`
Expected: `No errors found`.

- [ ] **Step 4: Verify the embedded select resolves against PostgREST**

The `tracked_budgets → recurring_expenses` embed in `listTrackedBudgets` must be checked the way the dashboard embed was. Run:

```bash
set -a; . ./.env.local; set +a
curl -s -w ' [HTTP %{http_code}]' \
  "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/tracked_budgets?select=sort_order,recurring_expenses(id,name,default_amount)" \
  -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $NEXT_PUBLIC_SUPABASE_ANON_KEY"
```

Expected: `[] [HTTP 200]`. RLS blocks the anon role so the array is empty, but PostgREST validates the relationship and every embedded column at planning time — a bad relationship returns 400 `PGRST200` and a bad column returns 400 `42703`.

- [ ] **Step 5: Commit**

```bash
git add lib/queries/spending.ts
git commit -m "feat: query layer for budget control

ensureBudgetSnapshots writes on first sight of a month rather than on a
schedule, because there is no scheduler, and upserts with ignoreDuplicates so
two tabs opening the same month cannot race into a key violation."
```

---

### Task 7: Pengaturan → Dilacak tab

**Files:**
- Create: `components/settings/tracked-tab.tsx`
- Modify: `app/(app)/settings/page.tsx`
- Modify: `app/(app)/settings/actions.ts`

**Interfaces:**
- Consumes: `listAllRecurringWithTracking`, `setTracked` from `lib/queries/spending.ts`; `ActionState` from `lib/types.ts`.
- Produces: `toggleTrackedAction(recurringExpenseId: string, tracked: boolean): Promise<ActionState>` exported from `app/(app)/settings/actions.ts`.

- [ ] **Step 1: Add the server action**

Append to `app/(app)/settings/actions.ts`:

```ts
import { setTracked } from '@/lib/queries/spending'

export async function toggleTrackedAction(
  recurringExpenseId: string,
  tracked: boolean
): Promise<ActionState> {
  try {
    await setTracked(recurringExpenseId, tracked)
    return { ok: true }
  } catch (e) {
    return { ok: false, message: messageFor(e, 'generic') }
  }
}
```

Put the `import` with the other imports at the top of the file, not inline.

- [ ] **Step 2: Write the tab component**

Create `components/settings/tracked-tab.tsx`:

```tsx
'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { formatRupiah } from '@/lib/format'
import type { ActionState } from '@/lib/types'

type Row = {
  id: string
  name: string
  default_amount: number
  is_active: boolean
  tracked: boolean
}

export function TrackedTab({
  rows,
  action,
}: {
  rows: Row[]
  action: (id: string, tracked: boolean) => Promise<ActionState>
}) {
  const [pending, startTransition] = useTransition()

  return (
    <Card>
      <CardContent className="space-y-4">
        <p className="text-muted-foreground text-xs">
          Pos yang dicentang muncul di halaman Belanja untuk dicatat harian.
          Tagihan tetap seperti kontrakan dan listrik tidak perlu dicentang —
          nominalnya sudah pasti, mencatatnya per transaksi tidak menambah
          informasi apa pun.
        </p>

        <ul className="divide-border divide-y">
          {rows
            .filter((r) => r.is_active)
            .map((r) => (
              <li key={r.id} className="flex items-center gap-3 py-2.5">
                <Checkbox
                  id={`tracked-${r.id}`}
                  checked={r.tracked}
                  disabled={pending}
                  onCheckedChange={(next) =>
                    startTransition(async () => {
                      const result = await action(r.id, next === true)
                      if (result && !result.ok) toast.error(result.message)
                    })
                  }
                />
                <Label htmlFor={`tracked-${r.id}`} className="flex-1 font-normal">
                  {r.name}
                </Label>
                <span className="amount text-muted-foreground text-sm">
                  {formatRupiah(r.default_amount)}
                </span>
              </li>
            ))}
        </ul>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 3: Wire the tab into the settings page**

In `app/(app)/settings/page.tsx`:

1. Add to the imports:

```tsx
import { TrackedTab } from '@/components/settings/tracked-tab'
import { listAllRecurringWithTracking } from '@/lib/queries/spending'
import { toggleTrackedAction } from './actions'
```

2. Add `listAllRecurringWithTracking()` to the existing `Promise.all`, destructuring it as `trackable`.

3. Add a trigger inside `<TabsList>`, after the existing ones:

```tsx
<TabsTrigger value="tracked">
  Dilacak <Count n={trackable.filter((r) => r.tracked).length} />
</TabsTrigger>
```

4. Add the panel alongside the other `<TabsContent>` blocks:

```tsx
<TabsContent value="tracked">
  <TrackedTab rows={trackable} action={toggleTrackedAction} />
</TabsContent>
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit && npm run lint && npm run build`
Expected: clean typecheck, clean lint, successful build.

- [ ] **Step 5: Check it in the browser**

Run `npm run dev`, open `/settings`, click the **Dilacak** tab. Tick **Jajan**, **Makan**, **Bensin**, **Parkir**. Reload and confirm the ticks survived, and the count next to the tab label reads 4.

- [ ] **Step 6: Commit**

```bash
git add components/settings/tracked-tab.tsx "app/(app)/settings/page.tsx" "app/(app)/settings/actions.ts"
git commit -m "feat: pick which budgets are followed daily

A separate tab rather than a toggle inside Rutin: the toggle reads better, but
the tab leaves every existing component untouched and lets the whole feature
be lifted out in one piece."
```

---

### Task 8: Belanja page — capture and the current month

**Files:**
- Modify: `lib/month.ts`, `lib/month.test.ts`
- Create: `app/(app)/spending/page.tsx`
- Create: `app/(app)/spending/loading.tsx`
- Create: `app/(app)/spending/actions.ts`
- Create: `components/spending/capture-form.tsx`
- Create: `components/spending/budget-row.tsx`
- Modify: `components/nav.tsx`

**Interfaces:**
- Consumes: `summarizeBudgetMonth` / `BudgetLine` from `lib/budget.ts`; `listBudgetsForMonth`, `ensureBudgetSnapshots`, `getSpendingForMonth`, `listNotes`, `addSpending`, `deleteSpending` from `lib/queries/spending.ts`; `RupiahInput`, `SubmitButton`, `DeleteButton`, `MonthPicker`, `PageHeader`, `Eyebrow` from existing components.
- Produces: `addSpendingAction(_prev: ActionState, formData: FormData): Promise<ActionState>` and `deleteSpendingAction(id: string): Promise<ActionState>` from `app/(app)/spending/actions.ts`.

- [ ] **Step 1: Add `currentDateParam` to `lib/month.ts`**

The page needs today's date for the capture form's default. `new Date().toISOString()`
gives the UTC date, so between 00:00 and 07:00 WIB it names yesterday — the same
trap `currentMonthParam` was written to avoid.

Append to `lib/month.ts`:

```ts
/** Today's date as 'YYYY-MM-DD' in WIB, for the same reason as `currentMonthParam`. */
export function currentDateParam(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}
```

Append to `lib/month.test.ts`:

```ts
import { currentDateParam } from './month'

describe('currentDateParam', () => {
  it('reads the WIB date, not the UTC one', () => {
    // 2026-08-04T18:30Z is already 2026-08-05 in Jakarta (UTC+7).
    expect(currentDateParam(new Date('2026-08-04T18:30:00Z'))).toBe('2026-08-05')
  })
  it('does not roll forward before the WIB day ends', () => {
    expect(currentDateParam(new Date('2026-08-04T16:59:00Z'))).toBe('2026-08-04')
  })
})
```

Run: `npx vitest run lib/month.test.ts`
Expected: PASS, including the two new cases.

- [ ] **Step 2: Write the server actions**

Create `app/(app)/spending/actions.ts`:

```ts
'use server'

import { addSpending, deleteSpending } from '@/lib/queries/spending'
import type { ActionState } from '@/lib/types'

const str = (fd: FormData, key: string) => String(fd.get(key) ?? '')
const num = (fd: FormData, key: string) => Number(fd.get(key) ?? 0)

function message(e: unknown): string {
  return e instanceof Error ? e.message : 'Terjadi kesalahan'
}

export async function addSpendingAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const amount = num(formData, 'amount')
  if (amount <= 0) return { ok: false, message: 'Nominal harus lebih dari nol' }

  const budget = str(formData, 'recurring_expense_id')
  const note = str(formData, 'note').trim()

  try {
    await addSpending({
      occurred_on: str(formData, 'occurred_on'),
      amount,
      recurring_expense_id: budget === '' ? null : budget,
      note: note === '' ? null : note,
    })
    return { ok: true }
  } catch (e) {
    return { ok: false, message: message(e) }
  }
}

export async function deleteSpendingAction(id: string): Promise<ActionState> {
  try {
    await deleteSpending(id)
    return { ok: true }
  } catch (e) {
    return { ok: false, message: message(e) }
  }
}
```

- [ ] **Step 3: Write the capture form**

Create `components/spending/capture-form.tsx`:

```tsx
'use client'

import { useActionState, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { RupiahInput } from '@/components/rupiah-input'
import { SubmitButton } from '@/components/submit-button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import type { ActionState } from '@/lib/types'

export function CaptureForm({
  budgets,
  notes,
  today,
  action,
}: {
  budgets: { id: string; name: string }[]
  notes: string[]
  today: string
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>
}) {
  const [state, formAction] = useActionState(action, null)
  const formRef = useRef<HTMLFormElement>(null)

  // Clearing on success keeps the form ready for the next entry — this is a
  // thing done several times a day, so it must not need a reload between.
  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset()
      toast.success('Tercatat')
    } else if (state && !state.ok) {
      toast.error(state.message)
    }
  }, [state])

  return (
    <Card>
      <CardContent>
        <form ref={formRef} action={formAction} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <div className="space-y-1.5">
            <Label htmlFor="amount">Nominal</Label>
            <RupiahInput name="amount" id="amount" required />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="recurring_expense_id">Pos</Label>
            <select
              id="recurring_expense_id"
              name="recurring_expense_id"
              className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
              defaultValue=""
            >
              <option value="">Tak terduga</option>
              {budgets.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="occurred_on">Tanggal</Label>
            <Input type="date" id="occurred_on" name="occurred_on" defaultValue={today} required />
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="note">Catatan</Label>
            <Input id="note" name="note" list="spending-notes" autoComplete="off" />
            <datalist id="spending-notes">
              {notes.map((n) => (
                <option key={n} value={n} />
              ))}
            </datalist>
          </div>

          <div className="flex items-end">
            <SubmitButton pendingLabel="Menyimpan…">Catat</SubmitButton>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 4: Write the budget row**

Create `components/spending/budget-row.tsx`:

```tsx
import { formatRupiah } from '@/lib/format'
import type { BudgetLine } from '@/lib/budget'

export function BudgetRow({ line }: { line: BudgetLine }) {
  const over = line.over > 0
  // `fill` arrives already clamped from lib/budget.ts — the component does no
  // arithmetic of its own beyond turning a fraction into a percentage string.
  const filled = line.fill * 100

  return (
    <li className="space-y-1.5 py-3">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm">{line.name}</span>
        <span className="amount text-muted-foreground text-xs">
          {formatRupiah(line.spent)} / {formatRupiah(line.budget)}
        </span>
      </div>

      <div
        className="bg-muted h-1.5 w-full overflow-hidden rounded-full"
        role="progressbar"
        aria-label={`Pemakaian ${line.name}`}
        aria-valuenow={Math.round(filled)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className={`h-full rounded-full ${over ? 'bg-destructive' : 'bg-primary'}`}
          style={{ width: `${filled}%` }}
        />
      </div>

      <p className="text-muted-foreground text-xs">
        {over
          ? `Lebih ${formatRupiah(line.over)}`
          : `Sisa ${formatRupiah(line.remaining)}`}
      </p>
    </li>
  )
}
```

- [ ] **Step 5: Write the page**

Create `app/(app)/spending/page.tsx`:

```tsx
import { Suspense } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { MonthPicker } from '@/components/month-picker'
import { Eyebrow, PageHeader } from '@/components/kwitansi'
import { DeleteButton } from '@/components/delete-button'
import { CaptureForm } from '@/components/spending/capture-form'
import { BudgetRow } from '@/components/spending/budget-row'
import {
  listBudgetsForMonth,
  ensureBudgetSnapshots,
  getSpendingForMonth,
  listNotes,
} from '@/lib/queries/spending'
import { summarizeBudgetMonth } from '@/lib/budget'
import {
  currentMonthParam,
  currentDateParam,
  toMonthParam,
  formatMonthLabel,
} from '@/lib/month'
import { formatRupiah } from '@/lib/format'
import { addSpendingAction, deleteSpendingAction } from './actions'

export default async function SpendingPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  const { month: monthParam } = await searchParams
  const month = toMonthParam(monthParam ?? currentMonthParam())

  // Snapshot first, then read the snapshot back: the figures on screen are the
  // ones that applied in `month`, not the ones that apply today.
  await ensureBudgetSnapshots(month)
  const budgets = await listBudgetsForMonth(month)

  const [spending, notes] = await Promise.all([
    getSpendingForMonth(month),
    listNotes(),
  ])

  const summary = summarizeBudgetMonth({
    budgets,
    spending: spending.map((s) => ({
      recurringExpenseId: s.recurring_expense_id,
      amount: s.amount,
    })),
  })

  const unattached = spending.filter((s) => s.recurring_expense_id === null)

  return (
    <div className="space-y-4">
      <PageHeader title="Belanja" lead={formatMonthLabel(month)}>
        <Suspense fallback={null}>
          <MonthPicker defaultMonth={month} />
        </Suspense>
      </PageHeader>

      <CaptureForm
        budgets={budgets}
        notes={notes}
        today={currentDateParam()}
        action={addSpendingAction}
      />

      {budgets.length === 0 ? (
        <Card>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              Belum ada pos yang dilacak. Pilih dulu di Pengaturan → Dilacak.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent>
            <ul className="divide-border divide-y">
              {summary.lines.map((line) => (
                <BudgetRow key={line.id} line={line} />
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="space-y-2.5">
          <div className="flex items-baseline justify-between gap-3">
            <Eyebrow>Tak terduga</Eyebrow>
            <span className="amount text-sm">
              {formatRupiah(summary.unattachedTotal)}
            </span>
          </div>

          {unattached.length === 0 ? (
            <p className="text-muted-foreground text-xs">
              Belum ada pengeluaran di luar pos bulan ini.
            </p>
          ) : (
            <ul className="divide-border divide-y">
              {unattached.map((s) => (
                <li key={s.id} className="flex items-center gap-3 py-2">
                  <span className="amount text-muted-foreground text-xs">
                    {s.occurred_on.slice(8, 10)}/{s.occurred_on.slice(5, 7)}
                  </span>
                  <span className="flex-1 text-sm">{s.note ?? '—'}</span>
                  <span className="amount text-sm">{formatRupiah(s.amount)}</span>
                  <DeleteButton
                    id={s.id}
                    label={s.note ?? 'catatan ini'}
                    action={deleteSpendingAction}
                  />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 6: Add the loading skeleton**

Create `app/(app)/spending/loading.tsx`, copying the shape of `app/(app)/dashboard/loading.tsx`. Read that file first and mirror it, changing only the title to `Belanja`.

- [ ] **Step 7: Add the nav link**

In `components/nav.tsx`, add `Wallet` to the `lucide-react` import and insert into `LINKS` between `/current` and `/goals`:

```tsx
{ href: '/spending', label: 'Belanja', icon: Wallet },
```

- [ ] **Step 8: Verify**

Run: `npx tsc --noEmit && npm run lint && npm test && npm run build`
Expected: all clean, 91 tests passing, build succeeds with `/spending` listed as a dynamic route.

- [ ] **Step 9: Check it in the browser**

Run `npm run dev` and open `/spending`. Then:
1. Record 25.000 against **Jajan**. Confirm the row's spent figure rises and the form clears without a reload.
2. Record 45.000 with no pos and the note `Laundry`. Confirm it appears under **Tak terduga**.
3. Record enough against **Parkir** to exceed its 36.000 budget. Confirm the bar turns destructive and the line reads **Lebih**.
4. Reopen the note field and confirm `Laundry` is offered as a suggestion.
5. Delete the Laundry entry and confirm the total falls.

- [ ] **Step 10: Confirm the snapshot was written**

Run through the Supabase MCP tool `execute_sql`:

```sql
select recurring_expense_id, month, amount from budget_months order by month desc;
```

Expected: one row per tracked budget for the current month, each amount matching that budget's `default_amount`.

- [ ] **Step 11: Commit**

```bash
git add "app/(app)/spending" components/spending components/nav.tsx
git commit -m "feat: record spending against the month's budgets

Capture is a row at the top of the page, not a modal — this is done several
times a day and a modal is one tap of friction each time. The form clears
itself on success so the next entry needs no reload."
```

---

### Task 9: Riwayat page — across months, and the adjustment

**Files:**
- Create: `app/(app)/spending/riwayat/page.tsx`
- Create: `app/(app)/spending/riwayat/loading.tsx`
- Create: `components/spending/series-row.tsx`
- Create: `components/spending/adjust-button.tsx`
- Modify: `app/(app)/spending/actions.ts`
- Modify: `app/(app)/spending/page.tsx` (add a link to the riwayat page)

**Interfaces:**
- Consumes: `compareAcrossMonths`, `suggestAdjustment`, `groupUnattached`, `BudgetSeries`, `Adjustment`, `NoteGroup` from `lib/budget.ts`; `listTrackedBudgets`, `getSpendingHistory`, `setBudgetAmount` from `lib/queries/spending.ts`; `shiftMonth`, `toMonthParam`, `formatMonthLabel`, `currentMonthParam` from `lib/month.ts`.
- Produces: `applyAdjustmentAction(recurringExpenseId: string, amount: number): Promise<ActionState>` from `app/(app)/spending/actions.ts`.

- [ ] **Step 1: Add the adjustment action**

Append to `app/(app)/spending/actions.ts`, and add `setBudgetAmount` to the existing `@/lib/queries/spending` import:

```ts
export async function applyAdjustmentAction(
  recurringExpenseId: string,
  amount: number
): Promise<ActionState> {
  if (amount <= 0) return { ok: false, message: 'Nominal harus lebih dari nol' }
  try {
    await setBudgetAmount(recurringExpenseId, amount)
    return { ok: true }
  } catch (e) {
    return { ok: false, message: message(e) }
  }
}
```

- [ ] **Step 2: Write the confirmation button**

Create `components/spending/adjust-button.tsx`:

```tsx
'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { formatRupiah } from '@/lib/format'
import type { ActionState } from '@/lib/types'

/**
 * The one place this feature writes the planner's data. Never one tap: the
 * dialog puts the old and new figure side by side first.
 */
export function AdjustButton({
  id,
  name,
  from,
  to,
  action,
}: {
  id: string
  name: string
  from: number
  to: number
  action: (id: string, amount: number) => Promise<ActionState>
}) {
  const [pending, startTransition] = useTransition()

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm">
          Ubah jadi {formatRupiah(to)}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Ubah budget {name}?</AlertDialogTitle>
          <AlertDialogDescription>
            Dari {formatRupiah(from)} jadi {formatRupiah(to)}. Ini mengubah
            definisi pengeluaran rutin, jadi bulan-bulan berikutnya akan
            memakai angka baru. Bulan yang sudah tercatat tidak berubah.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Batal</AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await action(id, to)
                if (result && !result.ok) toast.error(result.message)
                else toast.success('Budget diubah')
              })
            }
          >
            Ubah
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
```

- [ ] **Step 3: Write the series row**

Create `components/spending/series-row.tsx`:

```tsx
import { formatRupiah } from '@/lib/format'
import { formatMonthLabel } from '@/lib/month'
import { AdjustButton } from '@/components/spending/adjust-button'
import type { BudgetSeries, Adjustment } from '@/lib/budget'
import type { ActionState } from '@/lib/types'

const VERDICT: Record<Adjustment['kind'], string> = {
  raise: 'Lewat budget di 3 dari 4 bulan terakhir yang tercatat.',
  lower: 'Terpakai 60% atau kurang, empat bulan berturut-turut.',
  ok: 'Belum ada pola yang cukup jelas untuk disetel.',
}

export function SeriesRow({
  series,
  adjustment,
  currentBudget,
  action,
}: {
  series: BudgetSeries
  adjustment: Adjustment
  currentBudget: number
  action: (id: string, amount: number) => Promise<ActionState>
}) {
  return (
    <li className="space-y-2 py-4">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm">{series.name}</span>
        <span className="amount text-muted-foreground text-xs">
          budget sekarang {formatRupiah(currentBudget)}
        </span>
      </div>

      <table className="w-full text-xs">
        <tbody>
          {series.points.map((p) => (
            <tr key={p.month}>
              <td className="text-muted-foreground py-1">
                {formatMonthLabel(p.month)}
              </td>
              <td className="amount py-1 text-right">
                {/* A month with no snapshot is a gap. Printing 0 here would
                    read as "spent nothing", which is a different claim. */}
                {p.budget === null ? (
                  <span className="text-muted-foreground">belum tercatat</span>
                ) : (
                  `${formatRupiah(p.spent)} / ${formatRupiah(p.budget)}`
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted-foreground text-xs">{VERDICT[adjustment.kind]}</p>
        {adjustment.kind !== 'ok' && (
          <AdjustButton
            id={series.id}
            name={series.name}
            from={currentBudget}
            to={adjustment.amount}
            action={action}
          />
        )}
      </div>
    </li>
  )
}
```

- [ ] **Step 4: Write the page**

Create `app/(app)/spending/riwayat/page.tsx`:

```tsx
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Eyebrow, PageHeader } from '@/components/kwitansi'
import { SeriesRow } from '@/components/spending/series-row'
import { listTrackedBudgets, getSpendingHistory } from '@/lib/queries/spending'
import {
  compareAcrossMonths,
  suggestAdjustment,
  groupUnattached,
} from '@/lib/budget'
import { currentMonthParam, shiftMonth, toMonthParam, formatMonthLabel } from '@/lib/month'
import { formatRupiah } from '@/lib/format'
import { applyAdjustmentAction } from '../actions'

const WINDOW = 6

export default async function SpendingHistoryPage() {
  const current = currentMonthParam()
  const months = Array.from({ length: WINDOW }, (_, i) =>
    toMonthParam(shiftMonth(current, i - (WINDOW - 1)))
  )

  const budgets = await listTrackedBudgets()
  const { snapshots, spending } = await getSpendingHistory(months)

  const series = compareAcrossMonths({
    budgets: budgets.map((b) => ({ id: b.id, name: b.name })),
    snapshots,
    spending,
    months,
  })

  const budgetById = new Map(budgets.map((b) => [b.id, b.amount]))
  const newBudgets = groupUnattached({
    spending: spending
      .filter((s) => s.recurringExpenseId === null)
      .map((s) => ({ month: s.month, note: s.note, amount: s.amount })),
  })

  return (
    <div className="space-y-4">
      <PageHeader
        title="Riwayat budget"
        lead={`${formatMonthLabel(months[0])} — ${formatMonthLabel(months[months.length - 1])}`}
      >
        <Link href="/spending" className="text-muted-foreground text-sm underline">
          Kembali
        </Link>
      </PageHeader>

      <Card>
        <CardContent>
          {series.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Belum ada pos yang dilacak.
            </p>
          ) : (
            <ul className="divide-border divide-y">
              {series.map((s) => (
                <SeriesRow
                  key={s.id}
                  series={s}
                  adjustment={suggestAdjustment(s)}
                  currentBudget={budgetById.get(s.id) ?? 0}
                  action={applyAdjustmentAction}
                />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-2.5">
          <Eyebrow>Mungkin budget baru</Eyebrow>
          {newBudgets.length === 0 ? (
            <p className="text-muted-foreground text-xs">
              Belum ada catatan tak terduga yang berulang cukup sering.
            </p>
          ) : (
            <ul className="divide-border divide-y">
              {newBudgets.map((g) => (
                <li key={g.note} className="flex items-baseline gap-3 py-2">
                  <span className="flex-1 text-sm">{g.note}</span>
                  <span className="text-muted-foreground text-xs">
                    {g.months} bulan
                  </span>
                  <span className="amount text-sm">{formatRupiah(g.total)}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="text-muted-foreground text-xs">
            Pengeluaran tak terduga yang namanya berulang. Kalau memang rutin,
            daftarkan sebagai pengeluaran rutin di Pengaturan lalu centang di
            tab Dilacak.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 5: Add the loading skeleton and the link in**

Create `app/(app)/spending/riwayat/loading.tsx` mirroring `app/(app)/spending/loading.tsx`, with the title `Riwayat budget`.

In `app/(app)/spending/page.tsx`, add `import Link from 'next/link'` and put this inside the `PageHeader` children, before the `MonthPicker`:

```tsx
<Link href="/spending/riwayat" className="text-muted-foreground text-sm underline">
  Riwayat
</Link>
```

- [ ] **Step 6: Verify**

Run: `npx tsc --noEmit && npm run lint && npm test && npm run build`
Expected: all clean, 91 tests passing, both `/spending` and `/spending/riwayat` listed as dynamic routes.

- [ ] **Step 7: Check it in the browser with seeded history**

Seed three months of history so the verdicts have something to rule on. Through the Supabase MCP tool `execute_sql`, replacing `<JAJAN_ID>` with the real id from `select id, name from recurring_expenses where name = 'Jajan'`:

```sql
insert into budget_months (user_id, recurring_expense_id, month, amount)
select auth.uid(), '<JAJAN_ID>', m, 1750000
from unnest(array['2026-06-01','2026-07-01','2026-08-01']::date[]) m
on conflict do nothing;

insert into spending (user_id, occurred_on, amount, recurring_expense_id, note)
select auth.uid(), m, 1900000, '<JAJAN_ID>', null
from unnest(array['2026-06-15','2026-07-15','2026-08-15']::date[]) m;
```

Note: `auth.uid()` is null in the MCP session, so run these instead with the literal user id from `select id from auth.users limit 1`.

Open `/spending/riwayat` and confirm:
1. Jajan shows three recorded months and three earlier ones reading **belum tercatat**, not `Rp 0`.
2. Its verdict offers a raise, and the figure matches `suggestAdjustment`'s median rule.
3. Clicking the button opens a dialog naming both figures; cancelling changes nothing.
4. Confirming updates `recurring_expenses.default_amount`, and `/settings` → Rutin shows the new figure.

- [ ] **Step 8: Remove the seeded rows**

```sql
delete from spending where occurred_on in ('2026-06-15','2026-07-15');
delete from budget_months where month in ('2026-06-01','2026-07-01');
```

Leave August alone — that is real. Then re-check `/spending/riwayat` renders with the thinner history.

- [ ] **Step 9: Commit**

```bash
git add "app/(app)/spending" components/spending
git commit -m "feat: compare budgets across months and act on the finding

The verdict rule is printed next to each verdict, and the write into
default_amount sits behind a dialog naming the old and new figure. A month
with no snapshot renders as 'belum tercatat' — never as zero, which would be
a different and false claim."
```

---

### Task 10: Documentation and final verification

**Files:**
- Modify: `docs/PROGRESS.md`
- Modify: `README.md`

**Interfaces:**
- Consumes: everything above.
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Record the work in PROGRESS.md**

Add a section under the existing dated entries, following their tone — what was decided and why, not a changelog:

```markdown
### Budget control, 2026-08-04

Sangu planned but never knew what a month actually cost, so a budget could
drift from reality for years without anything saying so. Three new tables
record spending as it happens and hold it against `recurring_expenses`.

A full wallet ledger was designed first and dropped: it demands daily
discipline forever and its payoff, knowing your balance, is something
m-banking already gives away. The one question only sangu can answer is
whether a budget is realistic, and that is all this does.

Three decisions worth keeping:

1. **Tracking is opt-in per budget.** Of the 23 recurring expenses, only the
   variable ones — Jajan, Makan, Bensin, Parkir — carry information worth
   capturing daily. Logging Kontrakan per transaction tells you nothing you
   did not already know.
2. **`budget_months` snapshots the budget per month.** Without it, raising
   Jajan rewrites the July record that justified raising it. It ships with
   stage 1 even though only the riwayat page reads it, because a snapshot
   taken later cannot cover months already gone.
3. **A month with no snapshot renders as a gap, never zero.** A month you
   forgot to record is not a month you spent nothing, and that is the failure
   mode most likely to make the whole feature lie.

The one write into existing data is the adjust button, which sets
`recurring_expenses.default_amount` behind a confirmation dialog. An
observation that cannot change anything is just a chart.
```

- [ ] **Step 2: Add the page to the README structure block**

In `README.md`, under `app/(app)/`, change the page list to include the new page:

```
app/(app)/          dashboard · bulan ini · belanja · target · pengaturan
```

And add to the `lib/` list, keeping the existing alignment:

```
  budget.ts         budget vs realisasi + saran setel ulang (murni, teruji)
```

- [ ] **Step 3: Full verification**

Run each and confirm before claiming done:

```bash
npx tsc --noEmit
npm run lint
npm test
npm run build
```

Expected: `No errors found`; `No issues found`; 91 tests passing across 8 files; build succeeds listing `/spending` and `/spending/riwayat` as dynamic.

- [ ] **Step 4: Confirm the planner was left alone**

```bash
git diff --stat HEAD~9 -- lib/calculations.ts lib/generate.ts lib/goals.ts \
  lib/queries/dashboard.ts "app/(app)/dashboard" "app/(app)/current" "app/(app)/goals"
```

Expected: empty output. If anything shows here, the isolation promise was broken and it needs explaining or reverting.

- [ ] **Step 5: Commit**

```bash
git add docs/PROGRESS.md README.md
git commit -m "docs: record the budget control decisions

Why the wallet ledger was dropped, why tracking is opt-in, and why a month
with no snapshot must never render as zero."
```

---

## Self-review

**Spec coverage.** Every section of the spec maps to a task: schema and RLS → Task 1; the four pure functions → Tasks 2–5; query layer including snapshotting → Task 6; the Dilacak tab → Task 7; stage 1 capture and current month → Task 8; stage 2 comparison, note grouping and the confirmed adjustment → Task 9; the isolation check and documentation → Task 10. The spec's edge cases each have a test: zero budget (Task 2), gap versus zero (Tasks 3 and 4), month boundaries via `shiftMonth` (Task 6 Step 2), positive-amount enforcement (Task 1 check constraint plus Task 8 action guard).

**Placeholders.** None. An earlier draft of Task 6 shipped a knowingly-broken line in Step 1 and corrected it in Step 2; that was a plan failure — an implementer stopping at Step 1 would have committed a query with a wrong month bound — and the final text is now correct where it first appears.

**Type consistency.** `BudgetLine`, `BudgetMonthSummary`, `MonthPoint`, `BudgetSeries`, `Adjustment` and `NoteGroup` are defined in Tasks 2–5 and used with the same names and fields in Tasks 8 and 9. `ActionState` matches `lib/types.ts:2`. Query function names in Task 6 match every call site in Tasks 7–9.

## Known gaps

- **Editing a spending row** is not built; entries can be added and deleted only. Correcting a typo means delete and re-add. Worth adding once the feature has proven itself.
- **`getSpendingForMonth` returns every row for the month** with no pagination. At a few hundred rows a month this is fine and stays fine for years.
- **The riwayat window is fixed at six months** with no picker.
