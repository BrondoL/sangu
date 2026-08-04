# Budget control — design

2026-08-04

## The question it answers

**Which budgets are wrong, and is there a budget I am missing?**

Sangu plans. It says what a month should cost and how much to move to the proxy.
It has never known what a month actually cost, so the plan can drift from reality
for years without anything saying so. This feature records spending as it
happens and holds it against the budget, so that after a few months the answer
to "should Jajan really be 1.750.000?" comes from evidence instead of a hunch.

The output is a decision about the *definitions*: raise this budget, lower that
one, add one that does not exist yet.

## Scope

**In:** capturing individual expenses as they happen, holding them against the
budget for the current month, and comparing budget to actual across months well
enough to justify changing a budget.

**Out, deliberately:** account balances, income, transfers between accounts,
credit-card limits, instalments, savings goals. Each was considered and dropped —
a full wallet ledger demands daily discipline forever and its payoff (knowing
your balance) is something m-banking already gives away. What m-banking cannot
say is whether a budget is realistic, and that is the only thing this feature
tries to do.

## Isolation

The existing planner is not modified. Specifically, none of these change:
`lib/calculations.ts`, `lib/generate.ts`, `lib/goals.ts`, the `monthly_periods` /
`monthly_items` / `monthly_balances` tables, or any existing page.

The feature reads two existing tables and never writes them:
`recurring_expenses` (budget names and amounts) and, indirectly, `auth.users`.

**One exception, in stage 2, called out because it breaks the rule:** the
"apply this adjustment" button writes `recurring_expenses.default_amount`. That
is the entire point of the feature — an observation that cannot change anything
is just a chart. It is a single-column update through a new server action; it
does not touch the planner's code.

The write is behind a confirmation dialog showing the old and new figure,
following the `AlertDialog` pattern already in `components/delete-button.tsx`.
Nothing in this feature changes a budget without an explicit second tap.

## Which budgets get tracked

Not all 23. The recurring expenses split cleanly in two:

- **Fixed bills** — Kontrakan, Listrik, Wifi, Kontrol Abang, the bank fees,
  Kuota, Pulsa. One payment, amount known in advance. Logging them per
  transaction produces no information that was not already there.
- **Variable spending** — Jajan (1.750.000), Makan (1.000.000), Bensin, Parkir,
  Skincare, Toiletries, E Money, Self Reward. Many small transactions, total
  unknown until the month ends. This is the only place budget control means
  anything, and Jajan plus Makan alone are 2.750.000 of it.

So tracking is opt-in per budget. Untracked budgets never appear in this
feature. This is what keeps daily capture down to a handful of taps on the few
categories that actually vary, which is the difference between a feature that
gets used and one that gets abandoned in week three.

## Data model

Three new tables. No existing table is altered.

```sql
-- Which recurring expenses are followed here. Membership only.
create table tracked_budgets (
  user_id uuid not null references auth.users(id) default auth.uid(),
  recurring_expense_id uuid not null references recurring_expenses(id) on delete cascade,
  sort_order integer not null default 0,
  primary key (user_id, recurring_expense_id)
);

-- What the budget was in a given month, captured when the month is first seen.
create table budget_months (
  user_id uuid not null references auth.users(id) default auth.uid(),
  recurring_expense_id uuid not null references recurring_expenses(id) on delete cascade,
  month date not null,
  amount bigint not null,
  primary key (user_id, recurring_expense_id, month)
);

-- One expense, as it happened.
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
```

RLS on all three, with the same `owner_all` policy the other eight tables carry:
`for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())`.

### Why `budget_months` exists

Without it, stage 2 poisons its own evidence. Raise Jajan from 1.750.000 to
2.000.000 because July went over, and July's history silently re-reads as "under
budget" — the very record that justified the change destroys the justification.
Snapshotting the budget per month keeps history honest.

The row is written lazily: when the month's page is first loaded, any tracked
budget without a row for that month gets one, copying `default_amount` as it
stands then. **This must ship in stage 1 even though only stage 2 reads it** —
otherwise stage 2 launches against months that were never snapshotted.

### Deletion behaviour

Deleting a recurring expense (existing Pengaturan behaviour, unchanged) removes
its tracking row and its month snapshots, and its spending rows become
unattached — they turn into "tak terduga" rather than vanishing. Money that was
actually spent is never deleted by a definition change.

## Stage 1 — capture and the current month

Route `app/(app)/spending/`, nav label **Belanja**, fifth tab.

**Capture.** A single always-visible row at the top of the page: amount, budget
(a select of tracked budgets plus "Tak terduga"), date defaulting to today in
`Asia/Jakarta`, optional note. The note is free text with a datalist of notes
already used, so reuse is easier than retyping. Submitting keeps the form in
place and focused for the next entry. This is the whole capture surface — no
separate screen, no modal, because a modal is one tap of friction on a thing
done several times a day.

**The month.** Below it, one row per tracked budget: name, budget, spent,
remaining or over, and a bar. Then an untracked section listing individual
unattached expenses with their notes.

```
Agustus                          catat: [ 25.000 ] [Jajan ▾] [hari ini]

Jajan      1.750.000   terpakai 1.240.000   sisa   510.000  ▓▓▓▓▓▓▓░░░
Makan      1.000.000   terpakai 1.180.000   lebih  180.000  ▓▓▓▓▓▓▓▓▓▓
Bensin       200.000   terpakai   150.000   sisa    50.000  ▓▓▓▓▓▓▓░░░
Parkir        36.000   terpakai    41.000   lebih     5.000  ▓▓▓▓▓▓▓▓▓▓

Tak terduga                       167.000
  14/08  Laundry                   45.000
  22/08  Servis kipas             122.000
```

A month picker, matching the dashboard's. Each spending row can be edited or
deleted.

**Choosing what to track** is a new **Dilacak** tab in Pengaturan, listing the
active recurring expenses with a toggle each. A separate tab rather than a
toggle inside the existing Rutin tab: the toggle reads better, but the tab
leaves every existing component untouched and lets the whole feature be removed
in one piece. Cost: five tabs is tight on a phone.

## Stage 2 — across months, and the adjustment

Route `app/(app)/spending/riwayat/`.

Per tracked budget, the last six months of budget against actual, drawn from
`budget_months` (not from today's `default_amount`), with a verdict:

- **Consistently over** — over in at least three of the last four months with a
  snapshot. Suggests raising to the median of those actuals, rounded up to the
  nearest 10.000.
- **Consistently under** — used 60% or less in at least four consecutive months.
  Suggests lowering, same rounding.
- **Pas** — anything else. Says nothing and offers no button.

The rule is deliberately dull and stated on screen next to each verdict. A
suggestion you cannot check is a suggestion you cannot trust, and this one
changes a real number in your budget.

Months with no snapshot are shown as gaps, never as zero. A month you forgot to
record is not a month you spent nothing, and the difference has to survive on
screen — this is the failure mode most likely to make the whole feature lie.

**New budgets.** Unattached spending is grouped by note text across the window,
matched case-insensitively and with surrounding whitespace ignored. A note that
recurs in three or more months with a meaningful total is surfaced as "this
looks like a budget you do not have yet", with the total per month. That is the
second half of the goal: not just adjusting budgets, but noticing missing ones.

The grouping's honest limit: "laundry" and "Laundry" merge, "laundry" and "cuci
baju" do not. The note field's suggestions (below) are what actually make this
work; normalisation only cleans up the edges.

## Pure functions

Following the rule the repo already holds — no arithmetic in components, all of
it pure and tested in `lib/`.

`lib/budget.ts`:

- `summarizeBudgetMonth(budgets, spending)` → per budget `{ id, name, budget,
  spent, remaining, over, ratio }`, plus the unattached total. Handles a budget
  of 0 (Self Reward Nabil is currently 0) by reporting spend with no ratio
  rather than dividing by zero.
- `compareAcrossMonths(snapshots, spending, months)` → per budget, a series with
  explicit gaps for months that were never snapshotted.
- `suggestAdjustment(series)` → `{ kind: 'raise' | 'lower' | 'ok', amount }`
  implementing the rule above.
- `groupUnattached(spending, months)` → recurring notes and their monthly totals.

Each gets a test file alongside, as `calculations`, `generate`, `goals`,
`month`, `format` and `terbilang` already do.

`lib/queries/spending.ts` holds the Supabase access, one file per domain like
the rest of `lib/queries/`.

## Edge cases

- **Month boundaries** resolve in `Asia/Jakarta`, reusing `lib/month.ts`. A
  purchase at 23:00 on the 31st belongs to that month, not the next, regardless
  of where the server runs.
- **Zero budget** — report spend, no ratio, no verdict.
- **Amount** is a positive integer rupiah, enforced by a check constraint and at
  the form. No floats, per the repo rule.
- **Untracking a budget** keeps its history. Re-tracking it later shows the
  months it was away as gaps, not zeros.
- **Editing a spending row's date** moves it between months; both months'
  figures follow.

## Testing

Pure functions in `lib/budget.ts` are unit-tested with Vitest, including the
gap-versus-zero distinction and each verdict boundary. The query layer is not
unit-tested, matching the existing repo (no query tests exist today); it is
checked by driving the page.

## Decisions taken

1. **The adjustment button writes `default_amount` directly**, behind a
   confirmation dialog that shows the old and new figure. An observation that
   cannot change anything is just a chart.
2. **Tracking is chosen in a new Dilacak tab in Pengaturan**, keeping every
   existing component untouched.
3. **The note field is free text with suggestions from notes already used.** A
   pick-from-previous list alone is impossible — on day one it is empty, so the
   list has to grow from free text in the first place. The suggestions exist to
   make reuse the path of least resistance, which is what makes stage 2's
   grouping work at all.

## Not in this spec

- **Planner-side history** (total planned per category over a year, the transfer
  figure across months). Largely subsumed by stage 2, which compares against
  better data. Revisit once stage 2 has been used, and only if something is
  still missing.
- **Total remaining instalment debt.** Still worth building, but `installments`
  currently holds zero rows, so it would ship with no way to see it work. Waits
  for a real instalment.
