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

The dialog is not the guard, though. `lib/queries/spending.ts` carries a
top-level `'use server'`, so every export in it is an endpoint any page that
ever rendered can still call — a tab opened before a budget was untracked or
deactivated still holds a live reference to that action. The write therefore
re-checks its own preconditions: a positive integer amount, and a budget that
is still tracked and still active. Otherwise it refuses, in Indonesian.

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

The row is written lazily: when the **current** month's page is first loaded,
any tracked, still-active budget without a row for that month gets one, copying
`default_amount` as it stands then. Only the current month, because
`default_amount` is only known to be right for today — writing it into whatever
month the picker happens to land on would record November's budget as June's
and manufacture the very drift this table exists to prevent. A past month that
was never opened stays a gap, and a retired budget stops collecting rows.

Accepting an adjustment writes the new amount into the current month's row too,
upserting it. That month is still being lived, so the budget that applies to it
is the one just chosen; without this the page would show the new figure in the
header and the old one in the month, and the verdict would go on offering the
change that was already accepted. That row is also what stage 2 checks its
suggestion against, which is what retires the verdict — the month is not
graded, but it is the budget in force. Past months are never rewritten. **The write must ship in stage 1, and so must the read** — stage
1 itself reads the snapshot back, so the month you're looking at shows the
budget that applied then rather than whatever `default_amount` holds today,
and stage 2 reads the same table to draw its comparison across months. Only
the writing is a stage-1-only step: it has to run before stage 2 exists,
otherwise stage 2 launches against months that were never snapshotted.

### Deletion behaviour

Deleting a recurring expense (existing Pengaturan behaviour, unchanged) removes
its tracking row and its month snapshots, and its spending rows become
unattached — they turn into "tak terduga" rather than vanishing. Money that was
actually spent is never deleted by a definition change.

## Stage 1 — capture and the current month

Route `app/(app)/spending/`, nav label **Belanja**, fifth tab.

**Capture.** A single always-visible row at the top of the page: amount, budget
(a select of tracked budgets plus "Tak terduga"), date, optional note. The date
defaults to the month on screen — today in `Asia/Jakarta` when the current month
is open, otherwise the first of the month being viewed, so catching up on July
does not file into August (see the picker, below). The note is free text with a datalist of notes
already used, so reuse is easier than retyping. Submitting keeps the form in
place and focused for the next entry. This is the whole capture surface — no
separate screen, no modal, because a modal is one tap of friction on a thing
done several times a day.

**The month.** Below it, one row per tracked budget: name, budget, spent,
remaining or over, and a bar. Then every entry made in the month, newest first,
each showing which budget it went to — "Tak terduga" when it has none, or when
its budget is no longer tracked — and its note. Every row, not only the
unattached ones: a row that is not listed is a row that cannot be deleted, and
a mistyped amount that cannot be removed is what eventually raises a real
budget. Both figures beside the section heading are labelled, "total" and "tak
terduga", and the heading names the month it is showing rather than saying
"bulan ini" over a picker that may be on June.

Only the current month is snapshotted, so a past month the picker reaches may
have no budget recorded. Those rows read the same way Riwayat reads them —
spend, then "budget belum tercatat", no bar and no remaining-or-over — never a
budget of Rp 0 and never today's `default_amount` stood in for a month it never
applied to. Grading June against August's figure would print a red "Lebih" the
month's own history does not support, and would contradict Riwayat calling that
same month a gap.

```
Agustus                          catat: [ 25.000 ] [Jajan ▾] [tanggal]

Jajan      1.750.000   terpakai 1.240.000   sisa   510.000  ▓▓▓▓▓▓▓░░░
Makan      1.000.000   terpakai 1.180.000   lebih  180.000  ▓▓▓▓▓▓▓▓▓▓
Bensin       200.000   terpakai   150.000   sisa    50.000  ▓▓▓▓▓▓▓░░░
Parkir        36.000   terpakai    41.000   lebih     5.000  ▓▓▓▓▓▓▓▓▓▓

Catatan Agustus 2026   total 2.778.000 · tak terduga 167.000
  22/08  Servis kipas                     122.000  [hapus]
  20/08  Jajan / kopi                      25.000  [hapus]
  14/08  Laundry                           45.000  [hapus]
```

A month picker, matching the dashboard's. The capture date follows it: today
when the current month is open, otherwise the first of the month being viewed,
so catching up on July does not file into August. Each spending row can be
deleted, behind a confirmation naming the entry — its amount, its date and its
pos or note — because a dialog that says only "Hapus Jajan?" names a budget
summary row sitting directly above it, on a delete that cannot be undone.

Entries are ordered newest first by date, then by when they were recorded.
Several entries a day is the normal case, and date alone leaves those ties for
Postgres to order however it likes, which reshuffles the list between renders.

**Choosing what to track** is a new **Dilacak** tab in Pengaturan, listing the
active recurring expenses with a toggle each. A separate tab rather than a
toggle inside the existing Rutin tab: the toggle reads better, but the tab
leaves every existing component untouched and lets the whole feature be removed
in one piece. Cost: five tabs is tight on a phone.

## Stage 2 — across months, and the adjustment

Route `app/(app)/spending/riwayat/`.

Per tracked budget, the last six months of budget against actual, drawn from
`budget_months` (not from today's `default_amount`), with a verdict:

**The month in progress is not graded.** A month you are two days into has
spent a fraction of what it will cost, and reading that as a month's behaviour
is how a budget running perfectly well gets reported as consistently
under-used: 1.000.000 against 590.000, 580.000, 560.000 and then 40.000 on the
2nd gives a median of 570.000 and four months "at or under 60%". It breaks the
accept loop too — accepting writes the current month's snapshot, so a month
that had none joins the graded window and shifts it by one, producing a fresh
verdict the instant the old one was accepted. The current month still appears
in the table; it just does not vote.

The window the rule reads is the last four *finished* months that carry a
snapshot with a budget above zero. Those four are the last four recorded
months, not the last four calendar months — a gap in the middle is skipped
over, not counted as anything. With the month in progress set aside, the
six-month view offers five gradable months. Fewer than three recorded months
and no verdict is given at all: a user three months in, one of them the one
being lived, is ruled on by nothing.

- **Consistently over** — over budget in at least three of those four months.
- **Consistently under** — 60% or less of the budget used, with something
  actually recorded, in all four. A month with no spending at all is missing
  data, not thrift, and cannot vote here.
- **Pas** — anything else. Says nothing and offers no button.

Both suggest the same figure: the median of the actual spend across all four
months, rounded up to the nearest 10.000 — all four, not only the months that
triggered the verdict. Nothing is suggested when that figure works out to zero
or less, or when it equals the budget already in force.

"In force" is the current month's snapshot — the month that is not graded still
holds the budget a change would replace, and that is the comparison that lets
an accepted suggestion retire. Checking against the newest *graded* month
instead would check against a past month, whose snapshot accepting never
touches, and the row would go on offering a change already made.

The rule is deliberately dull and stated on screen next to each verdict. A
suggestion you cannot check is a suggestion you cannot trust, and this one
changes a real number in your budget.

Months with no snapshot are shown as gaps, never as zero. A month you forgot to
record is not a month you spent nothing, and the difference has to survive on
screen — this is the failure mode most likely to make the whole feature lie.
The gap is in the *budget*, though, not in the spending: if money was logged in
such a month it is still shown, next to a note that the budget was never
recorded. Hiding it would be the same lie from the other side.

**New budgets.** Unattached spending is grouped by note text across the window,
matched case-insensitively and with surrounding whitespace ignored. A note that
recurs in three or more months with a meaningful total is surfaced as "this
looks like a budget you do not have yet", with the total per month. That is the
second half of the goal: not just adjusting budgets, but noticing missing ones.

"Unattached" here means every row no series on this page can claim: spending
with no budget, and spending against a budget that is not among the ones drawn
above. The second kind is the same money Belanja counts as "tak terduga", and
it has to be pooled the same way — otherwise untracking a budget takes its
recorded spending off this page entirely, matching no series and excluded from
the grouping too. The pool is built from the same budget list the series come
from, so the two cannot disagree; a retired budget that is still tracked has
its own series with a "Non-aktif" badge and is never pooled here.

Beside the heading, the total of that whole pool across the window. The list
alone cannot carry it: grouping is by note, so a row with no note, or a note
that never repeats, reaches no group and its money would be invisible. The
grouping answers "which budget am I missing"; the total answers "how much is
sitting outside my budgets at all".

The grouping's honest limit: "laundry" and "Laundry" merge, "laundry" and "cuci
baju" do not. The note field's suggestions (below) are what actually make this
work; normalisation only cleans up the edges.

## Pure functions

Following the rule the repo already holds — no arithmetic in components, all of
it pure and tested in `lib/`.

`lib/budget.ts`:

- `summarizeBudgetMonth(budgets, spending)` → per budget `{ id, name, budget,
  spent, remaining, over, ratio, fill }`, plus the unattached total and the
  month's total spend. Handles a budget of 0 (Self Reward Nabil is currently 0)
  by reporting spend with no ratio rather than dividing by zero. Handles a month
  with no snapshot the same way `compareAcrossMonths` does — `budget: null`,
  and `remaining`/`over` null with it, in one union so nothing can report "Sisa
  Rp 0" against a budget that was never written down. A budget of zero and a
  budget nobody recorded are different claims and stay distinguishable.
- `compareAcrossMonths(snapshots, spending, months)` → per budget, a series with
  explicit gaps for months that were never snapshotted.
- `suggestAdjustment(series, excludeMonth?)` → `{ kind: 'raise' | 'lower' |
  'ok', amount }` implementing the rule above. `excludeMonth` names a month to
  keep out of the grading — the page passes the current one. Excluded from
  grading only: that month's snapshot is still what the suggestion is compared
  against.
- `poolUnattached(spending, budgetIds)` → the rows no rendered series can claim,
  and their total. Both halves of Riwayat's second card read this, so the money
  cannot fall between them.
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
  months it was away as gaps, not zeros. Spending already filed against it has
  no line to sit under any more, so on the month page it reads as "tak terduga"
  and counts towards that total — visible and deletable. On Riwayat it joins
  the unattached pool, so it counts towards that page's tak-terduga total and
  can still surface as a budget worth having. Untracking must not be able to
  make recorded money vanish from the screen, on either page.
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
