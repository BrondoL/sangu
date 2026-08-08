# Sangu — Progress & Handoff

Last updated: 2026-08-08

Companion to `docs/superpowers/plans/2026-08-03-sangu.md` (step checkboxes there
are ticked through Task 11) and `docs/superpowers/specs/2026-08-03-sangu-design.md`.

## Status

| Task | State |
|---|---|
| 1. Project scaffold | ✅ done |
| 2. Types, formatting, calculation engine | ✅ done |
| 3. New-month generation planner | ✅ done |
| 4. Database schema + RLS | ✅ done, migration applied |
| 5. Supabase clients + auth proxy | ✅ done |
| 6. Login / logout | ✅ done |
| 7. App shell, nav, PWA | ✅ done (no service worker — spec amended) |
| 8. Query + mutation layer | ✅ done |
| 9. Settings page | ✅ done, verified in browser |
| 10. Current-month page | ✅ done, verified in browser |
| 11. Dashboard | ✅ done, verified in browser |
| 12. Target (savings goals) page | ✅ code done, ⬜ **browser check pending** |

All plan tasks are implemented, and the visual design, responsive, settings,
robustness and calculation passes that followed are recorded below. Checks at
the last commit: `npm run build` passes, `npm run lint` reports no issues,
`npm test` is 68 passing across 6 files.

**The one thing never done: the app has never been opened by a logged-in user.**
Every visual check in this repo's history was made against a throwaway harness
with sample data, because the session that built it had no credentials. The
calculation engine is exercised from several directions by tests and was
reconciled against the real August figures in the database, but no save button,
dialog or paid-toggle has been clicked for real. Task 12 step 6 is the formal
name for the tail of this.

Worth running once, in this order: change an amount in Bulan Ini, tick an item
paid, add a manual expense and delete it, then open Target. Those four cover the
write path end to end; everything after that is ordinary use.

## Visual design, 2026-08-04

The default shadcn neutral theme was replaced with a deliberate one. Direction:
**kwitansi** — the app is a monthly financial document, not a dashboard.

- **Palette** from the two dyes on a batik cloth: nila (indigo) as the ground,
  kunyit (turmeric) as the single accent, gading (ivory) as the undyed cotton.
  Dark mode was designed first and is the ground the palette was built on; light
  is a warm paper. Every ratio in `app/globals.css` is measured, and the comment
  next to each token records it. Kunyit is the action colour in both modes and
  always carries nila text — white on turmeric never clears 4.5:1.
- **Type**: Schibsted Grotesk for voice, IBM Plex Mono for every rupiah figure
  and every uppercase label. Amounts are mono so digits stack down a column.
- **Signature**: the `Terbilang` line under the transfer figure, the way a
  kwitansi, cheque and bank slip all carry it. It is not decoration — an
  eight-digit rupiah figure is easy to misread by a factor of ten, and reading
  the words back is the check against that. `lib/terbilang.ts` is pure and
  tested, like the rest of `lib/`.
- **Charts** were re-stepped for the new surfaces and both sets re-validated
  with the dataviz skill's script: lightness band, chroma floor, CVD separation,
  normal-vision floor and 3:1 contrast all pass in both modes. Tritan separation
  sits near the floor, so slices stay direct-labelled with a table of the same
  numbers on the page.
- **Theme switching** now works: `next-themes` was already a dependency but was
  never wired up. Follows the system by default, with a toggle in the header.
  Which icon shows is decided in CSS off the `.dark` class rather than in React,
  so there is no hydration mismatch and no mounted flag.

Conventions worth keeping: uppercase eyebrows are for labels and column heads
only, never for content — an account name or an amount inside a sentence stays
in sentence case. Money inputs are a ruled line, not a boxed field.

### Calculation corrections from the first real month, 2026-08-04

Piloting against real Excel figures put the engine under conditions the spec's
worked example never covered. Three corrections, each with tests; the spec
carries an amendment for each.

1. **The salary receiver's surplus was left stranded.** Shortfall is clamped at
   zero, so a receiver already holding more than its own expenses was invisible.
   The salary got swept to the proxy while money already sitting in the receiver
   stayed idle, though both are free money — Rp 2.279.559 in the first month.
   The receiver is the one account a transfer is leaving anyway, which is what
   separates it from any other account in surplus.
2. **"Sisa gaji" became wrong the moment (1) landed** — the transfer carried the
   surplus but the leftover figure did not count it. It is now **uang bebas**,
   salary minus the net shortfall, which is also exactly what the proxy still
   holds after topping up every short account. Both directions are asserted.
   Renamed because part of it never came from that month's pay, and it switches
   to **Kurang** with the sign dropped when negative.
3. **The transfer was unpayable in a deficit month.** Stated as what the proxy
   *needs* it asked for money that did not exist and double-counted the surplus.
   Restated as what the receiver *can spare*: `max(0, gaji − ditahan + kelebihan)`.
   Algebraically identical whenever the salary covers everything, correct when it
   does not.

`Breakdown` on the dashboard writes the whole derivation out line by line. It
exists because the first attempt — a terse hint under each stat card — left the
owner of the app unable to tell what the numbers meant, which is the only test
that matters. It also restores the base-salary comparison the spec asks for,
which had been dropped when those hints replaced it.

It is a native `<details>`, closed by default: the derivation answers a question
you ask once, and after that it is in the way. Native rather than a Radix
collapsible so the component stays a server component and ships no JavaScript,
with keyboard support and the disclosure semantics already correct.

### Pre-production review, 2026-08-04

Checked rather than assumed: RLS is on with a policy on all eight tables
(queried `pg_class`/`pg_policies` directly), Supabase's security advisor returns
one WARN, the auth proxy calls `getUser()` so the session is validated server
side, nothing secret is tracked by git, and no debug scaffolding survives. Four
edge cases were driven through the engine — no accounts, zero salary, a receiver
surplus larger than every shortfall, and one account carrying both roles.

Three things that check turned up, all fixed:

1. **`/_next/image` was reachable and pointless.** It is exempt from the auth
   proxy, and `sharp` carries four high-severity libvips CVEs, while the app
   uses `next/image` nowhere at all. `images: { unoptimized: true }` retires the
   endpoint. (`npm audit fix --force` proposes downgrading Next to 9.3.3 — do
   not. The remaining `postcss` advisory is build-time only, with no
   externally-supplied CSS.)
2. **One account could hold both roles.** The partial unique indexes forbid two
   receivers or two proxies, not both flags on one row, and the result was a
   silent instruction to move money from an account to itself. Now a
   `receiver_is_proxy` warning, and no transfer figure.
3. **A negative line in the breakdown.** When the receiver's spare cash covers
   every shortfall the net figure goes below zero, and "Harus ditutup gaji
   −47.000.000" is true and unreadable. The line changes sides instead: the
   salary *gains* that much.

### Robustness + PWA catch-up, 2026-08-04

Four loose ends closed after the redesign audit:

1. **Icons and manifest had been left behind by the redesign.** They still said
   `#0a0a0a` with a white "S", while the app had moved to nila `#0c1626` — so an
   installed copy showed a splash screen and title bar in the old palette. The
   mark is now the wordmark's kunyit-on-nila "S" in IBM Plex Mono, rendered
   through headless Chromium so it uses the real brand font, and sized inside
   the maskable safe zone. `any` and `maskable` are declared as separate icon
   entries rather than one combined `"any maskable"`. `app/favicon.ico` and
   `app/apple-icon.png` were replaced too — Next picks both up by filename. The
   favicon is drawn from its own tighter, heavier render rather than a downscale
   of the app icon: the maskable padding wastes half the frame at 16px and the
   600-weight glyph goes to mush. It ships 16/32/48 only, because including a
   256 frame pushes the `.ico` past 250 KB and the manifest already covers the
   large sizes.
2. **`app/(app)/error.tsx` + `app/error.tsx` + `app/not-found.tsx`.** Every
   query in `lib/queries/` rethrows the Supabase error, so before this a lapsed
   session produced Next's bare production error page. The app-level boundary
   sits inside the shell so the nav stays usable. The raw message is shown on
   purpose — this app has one user and they wrote it.
3. **Copy button on the transfer figure**, copying bare digits with no "Rp" and
   no separators, since the next thing that happens to that number is being
   pasted into a banking app.
4. **Loading states.** A `loading.tsx` skeleton per route, plus the month picker
   dims its label during the transition; its arrows stay live so you can keep
   stepping without waiting for each fetch.

Note the 404 is only reachable while signed in — the auth proxy redirects
anonymous requests for unknown paths to `/login`, which is the right call.

### Settings page, 2026-08-04

Settings is the master register at the back of the ledger, and it now reads that
way. `components/settings/definition-list.tsx` holds the shared shell all four
lists wear, so the tabs no longer each reinvent the layout:

- Every list states what it is and what it feeds, and its **Tambah** button is
  anchored to that header rather than floating alone above the page.
- Rows follow the money rail — name, a meta line, the figure, then controls.
  The unit sits in the header (`dalam rupiah`) instead of repeating "Rp" down
  the column, and each register closes on a total: the fixed monthly commitment
  it represents.
- Roles and states are tags: penerima gaji, proxy, kartu kredit, nonaktif,
  lunas. Instalments show which month of the tenor they are on plus a bar —
  only while actually running, since a full bar on a settled one and an empty
  one on a future one both just read as a stray rule.
- Tab labels carry counts, so an empty register is visible without opening it.
- `monthsBetween` was added to `lib/month.ts` (pure, tested) for the tenor
  position.

Two layout traps worth remembering, both hit here:

- **Don't `truncate` a line that holds several facts joined by "·".** Clipping
  drops the last fact entirely rather than shortening it. That line wraps now.
- **Don't put mixed text and tags in a flex row.** Every text run becomes its
  own flex item, so the row gap lands on top of the spaces already in the copy
  and separators get double-spaced. It flows as ordinary text with inline tags.
  Related: JSX strips whitespace between two elements on separate lines, which
  glues "BCA" to "·" — those metas are plain template strings.

### Responsive pass, 2026-08-04

Reviewed at 375, 768 and 1440 in both modes. Three real defects, all fixed:

1. **The pie legend overflowed its card and was clipped** — amounts and the
   whole percentage column were cut off from `sm` up. Cause: `w-full` on the
   legend `ul` beside a `shrink-0` donut in a flex row resolves to the full row
   width. It is `min-w-0 flex-1` now.
2. **Donut beside legend only works in a wide card.** With the fix above the
   names truncated to a single initial instead, because in the two-column grid
   each card is ~330px. The row now starts at `lg`, stacked below that.
3. **The goal card collided with itself** — "20% dari 1.500.000.000" ran into a
   nine-digit total. The target moved under the bar as a caption, and the month
   came out of the "Sudah menabung" line since the page header already names it.

Desktop also stopped being a stretched phone: the container widens to
`max-w-5xl` at `lg` and the four destinations move into the header, with the
bottom tab bar hidden there.

**Verifying layout in this environment:** headless Chromium clamps its window to
~485 CSS px, so `--window-size=375` renders a 500px-wide layout and merely crops
the image — which looks exactly like a horizontal overflow bug and is not one.
To check phone widths, constrain the content column with a temporary
`max-width` and compare `scrollWidth` against `clientWidth` per element instead
of trusting the screenshot. Done that way, nothing overflows at a 375px column.
Also note `--screenshot` alone does not wait for hydration, so Recharts renders
blank; `--virtual-time-budget=9000 --run-all-compositor-stages-before-draw`
fixes it, and `--dump-dom` is the reliable way to read computed sizes.

## Spec audit, 2026-08-03

The whole codebase was read against the spec after Task 12. Data model,
calculation order, generation rules, the Target formula, and the eight required
test cases all matched. Four things did not, and three were fixed:

1. **Dashboard hid deactivated accounts that still had data.**
   `getMonthlyData` filtered accounts to `is_active`, but loaded every item in
   the period. An item belonging to an account retired since still counted in
   Total pengeluaran while its row and its shortfall vanished — so *Transfer ke
   proxy* came out too low and *Sisa gaji* too high on old months. It now loads
   all accounts and keeps the inactive ones that have an item or a balance in
   that period. Spec §Kasus Tepi required this; the query layer has no tests, so
   this one is only covered by types and the browser.
2. **`transferToProxy` was still computed with no salary receiver.** Spec and
   plan both say the number is not computed when either role is unassigned; only
   the missing-proxy case was handled. Now null for either, with the assertion
   added to the existing `no_salary_receiver` test. The dashboard hint text was
   rewritten to name whichever role is missing.
3. **The Target card printed "Perkiraan tercapai —".** Spec asks for the row to
   be absent when there is no target amount or no monthly deposit.
4. **No service worker.** Left unbuilt on purpose; the spec's PWA section now
   carries the amendment explaining why. Plan Task 7 never included one either.

## Picking this up on another machine

```bash
npm install
cp .env.local.example .env.local   # then fill both values
npm run dev
```

`.env.local` is gitignored and must be recreated. Both values come from the
Supabase dashboard → Project Settings → API for project **`sangu`**
(ref `swuqbwyauxepoeaxrtlk`, region ap-southeast-1):

- `NEXT_PUBLIC_SUPABASE_URL` — `https://swuqbwyauxepoeaxrtlk.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — the legacy anon key

The single auth user already exists and signup is disabled in that project.

**The seed data was cleared on 2026-08-04** to start the pilot against real
numbers from the Excel sheet; only `auth.users` was left alone. A snapshot of
the old test data was kept for a while and then deleted once the real month was
in — there is no rollback to it, and none is wanted.

An empty `settings` table is safe: `getSettings` falls back to `base_salary: 0`
when the row is absent, and `setBaseSalary` upserts with an explicit `user_id`,
so the row reappears the first time a base salary is saved.

### If the UI renders but nothing is clickable

Next.js dev blocks `/_next/*` requests coming from a different origin. Running
in WSL2 and browsing from Windows via the WSL interface IP triggers this, and the
symptom is a page that looks fine but does not hydrate — no tabs, no dialogs. Two
fixes: browse via `http://localhost:3000` instead, or put the current WSL IP in
`allowedDevOrigins` in `next.config.ts` (it currently holds `172.28.235.15`,
which changes when WSL restarts — check with `ip addr show eth0`).

## Deviations from the plan

Each was a deliberate call; the plan text was not rewritten to match.

1. **Next.js 16, not 15.** `create-next-app@latest` now ships 16. Consequence:
   the `middleware.ts` convention is deprecated, so the root file is `proxy.ts`
   exporting `proxy()`. `lib/supabase/proxy.ts` is unchanged.
2. **`shadcn init -b neutral` is no longer valid** — `-b` now selects the
   component library. Used `-b radix -p nova`.
3. **One plan test expectation was wrong.** The "handles no items" case expected
   `transferToProxy` of `20_000_000`, but with `actualSalary: 22_000_000` the
   spec's formula yields `22_000_000` (20jt is the base salary, not a result).
   The test asserts the spec-correct value.
4. **`generateMonth` uses select-then-insert**, not `upsert` with
   `onConflict: 'user_id,month'`. `user_id` is filled by a column default, so the
   upsert path depended on PostgREST behaviour that could not be tested without a
   session. Same result, same idempotency, guarded by the unique constraint.
   `setBaseSalary` and `setBalance` do send `user_id` explicitly, because those
   genuinely need an unambiguous conflict target.
5. **Added `lib/month.ts`** (not in the plan) with `shiftMonth`, `toIsoMonth`,
   `toMonthParam`, `formatMonthLabel`, `currentMonthParam` — all pure and tested.
   `currentMonthParam` resolves "now" in `Asia/Jakarta`; on a UTC host the first
   hours of a new month would otherwise resolve to the previous one.
6. **RLS policies are scoped `to authenticated`**, so they are not evaluated for
   the `anon` role. Semantics are unchanged.
7. **Chart palette replaced.** The shadcn `neutral` preset makes `--chart-1..5`
   five greys, which cannot carry categorical identity in a pie. `app/globals.css`
   now holds a categorical palette validated with the dataviz skill's script
   against the real card surfaces (`#ffffff` light, `#171717` dark): all gates
   pass in both modes; in light mode `--chart-3` and `--chart-4` fall under 3:1
   contrast, which is why every slice carries a direct label and a table of the
   same numbers is always on the page. Do not reorder or recycle these slots.
8. **Generated items cannot be deleted** in the current-month page — only manual
   ones. Deleting a generated row is pointless because syncing recreates it; zero
   it out for one month, or deactivate the definition.
9. **`lib/goals.ts` reuses `shiftMonth`/`toIsoMonth`** instead of the private
   `addMonths` the plan spelled out. Same arithmetic, already tested, one copy.
10. **The goals page has no month picker.** Accumulation is cross-period, so a
   picker would move only the checklist while every total stayed put. The page
   pins itself to `currentMonthParam()` and says which month the checklist is
   for.
11. **The "sudah menabung" checklist is an icon, not a checkbox.** The plan said
   read-only checkbox; a disabled checkbox reads as a broken control. It is a
   status line with three states — paid, unpaid, and no saving item generated
   for this month at all.
12. **Manually added items are always `expense`.** Other categories come from
   definitions; a hand-made row would lack `source_id` and the generator would
   duplicate it the following month.

## Task 12 in brief

`lib/goals.ts` + `lib/goals.test.ts` (pure `projectGoal`, TDD — plan has the test
body), then `app/(app)/goals/page.tsx` replacing the placeholder, using the
existing `getGoalProgress()` in `lib/queries/goals.ts` plus the current month's
saving items for the "sudah menabung bulan ini" checklist.

## Budget control, 2026-08-04

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
   Jajan would rewrite the July record that justified raising it. Both pages
   read it, not just one: Belanja through `listBudgetsForMonth`, so the month
   you're looking at shows the budget that applied then rather than the one
   that applies today, and Riwayat through `getSpendingHistory`, to draw the
   comparison across months. Only the writing is stage-1-only — the snapshot
   is taken the first time a month's page is opened, and a snapshot taken
   later cannot cover months already gone.
3. **A month with no snapshot renders as a gap, never zero.** A month you
   forgot to record is not a month you spent nothing, and that is the failure
   mode most likely to make the whole feature lie.

The one write into existing data is the adjust button, which sets
`recurring_expenses.default_amount` behind a confirmation dialog. An
observation that cannot change anything is just a chart.

A fourth decision came out of building the thing, not out of the spec.
**Deactivating a tracked expense does not make its budget disappear.** It
stays in Dilacak, marked "Non-aktif", so it can still be untracked by hand,
and its spending history stays on Riwayat exactly as recorded. But it drops
off Belanja — a retired expense has nothing live to spend against — and
Riwayat stops offering it an adjustment — not because `default_amount` is
gone, deactivating only flips `is_active` and the amount sits there untouched
— but because there is no live month left for a changed figure to apply to,
so the app declines to offer a change with nothing left to test it against.
Deleting the row outright would have taken an already-recorded month down
with the definition that produced it, which is the same failure mode
decision 3 above was written to avoid.

A few smaller choices are worth naming so they don't get "cleaned up" later
by someone who didn't see why they're there:

- `BudgetLine` carries both a raw `ratio` and a pre-clamped `fill`. The
  project rule is no arithmetic in components, and a ratio past 1 is exactly
  what a bar has to clamp before it can render — doing both in `lib/budget.ts`
  means the bar component never has to do that math itself.
- The capture form clears its amount by remounting `RupiahInput` under a
  changing `key`, not `form.reset()`. A native reset cannot clear a
  React-controlled input, and the stale figure would otherwise sit there
  ready to be resubmitted as the next entry's amount.
- The verdict sentence on Riwayat reads its denominator off the verdict's own
  `months` count instead of stating one. A hardcoded fraction was tried first
  and turned out to claim both a denominator and a consecutiveness the
  underlying rule never actually guarantees.

**Not opened by a human yet.** Same limitation as the rest of this document:
no agent in this run could drive a browser, so nothing above has been
click-tested against a real session. The database currently holds no tracked
budgets at all, so the first thing a human has to do before anything else is
testable is tick some on in Pengaturan → Dilacak. The full list of what still
needs a real browser is in `task-10-report.md` under
`.superpowers/sdd/2026-08-04-budget-control/`.

### Two mechanisms that can now be seen to break, 2026-08-04

The tests here had only ever covered pure functions, plus two components
asserted as static markup. That is the right shape for a calculator and the
wrong shape for the code that writes a financial record: the one Critical
defect in this branch was a capture form that never cleared its amount, and it
passed `tsc`, lint, the whole suite *and* the production build, because what
was wrong about it was not its output at any one moment but what it still held
a moment later. A human reading two files found it.

Two mechanisms carry that lesson and now have tests that have been watched to
fail. `components/spending/capture-form.test.tsx` fills the amount, submits,
and asserts a second Catat posts `0` rather than the first entry's figure —
with the remount key removed it posts the first figure twice, which is the
original defect exactly. `components/form-dialog.test.tsx` opens a dialog on
one row, closes it, reopens it on another, and asserts the second row's amount
is what shows — with `<Fragment key={opens}>` removed it shows the first row's.

Both files opt into a DOM with a `// @vitest-environment jsdom` docblock rather
than through `vitest.config.mts`, so the ten node-environment files still spin
up no environment at all and run in the same 430ms they did before. The only
new dependency is `@testing-library/react`.

The dialog test has to lie to jsdom about one thing, and it is worth knowing
why. The mechanism only matters inside the exit-animation window, and jsdom
runs no CSS, so Radix sees no animation, unmounts on close, and hands the
fields their defaults back on its own — the test would pass with the mechanism
deleted. So `getComputedStyle` is stubbed to report an exit animation for the
nodes Radix drives by `data-state`, and a first assertion checks the dialog is
still in the DOM after closing, so that if a future Radix stops suspending, the
suite says so instead of quietly going green for the wrong reason.

**What this does not cover, deliberately.** `lib/queries/` still has no tests
at all. Every one of them talks to Supabase, and testing them honestly means
either a live database — which no test here is allowed to write to — or a mock
of the client deep enough that it would mostly be testing itself. Two component
mechanisms are verified; the layer that actually reads and writes the ledger is
not, and that gap is a stated limit rather than an oversight. Neither is any
other component: the two here were chosen because they are the branch's most
fragile and least observable, not because the rest were checked and cleared.

## Undo on the month page, 2026-08-08

Bulan Ini had no way back from either of its two creating actions. A row that
came from a definition could not be deleted, and a month opened by mistake
stayed opened. Both now have an undo, and each rests on a different mechanism.

**A row can leave one month.** Deleting a generated row is a real delete, and
the row's `source_id` is appended to `excluded_source_ids`, a `uuid[]` added to
`monthly_periods` by migration `0005_period_exclusions.sql` (applied to the
remote project on 2026-08-08). That column is the whole point of the feature.
`generateMonth` decides what to create by asking which source ids are already in
the period, so without a record of the omission the next press of Sinkron
definisi puts the row straight back. `planNewMonthItems` now folds the excluded
ids and the present ids into one `skip` set, which is why the rule lives in a
pure function and has tests rather than living in the query layer where nothing
could hold it.

The alternative considered and rejected was an `is_removed` flag on
`monthly_items`. It would have kept the amount and made undo trivial, but it
would have obliged all four readers of that table — `getItems`,
`getGoalProgress`, and both dashboard queries — to filter forever, and a
forgotten filter inflates a total silently with no test in the way. Deleting
outright means there is nothing to filter and no calculation query changed.

Restoring is a footnote under the groups: clear the array, then sync. The items
return through the ordinary generation path, which matters because they return
with their `source_id` intact — a savings row re-added by hand would carry a
null one and stop counting toward goal progress.

**A month can be dropped whole.** One delete on `monthly_periods`;
`monthly_items` and `monthly_balances` follow through the cascades already
declared in `0001_init.sql`, and `actual_salary`, `note` and
`excluded_source_ids` live on the deleted row. Spending survives on purpose:
`spending` and `budget_months` are keyed by date, not `period_id`, so no cascade
reaches them. Cancelling a plan should not erase the record of money that
actually left the account.

The trigger sits at the foot of the page rather than beside Sinkron definisi,
and its dialog names what will be lost —
`describePeriodContents` in `lib/period-summary.ts`, pure and tested, with zero
counting as empty so a Rp 0 balance never pads the warning. No month is locked:
a month filled in by mistake is the one you most need to remove, so reporting
was chosen over restricting.

**Knock-on worth remembering:** a new month inherits amounts from the month
before it. Delete August, generate September afterwards, and September finds no
August and falls back to the definition amounts. A September that already exists
does not change, because inheritance is resolved once at generation time.

**Verified.** `npm test` is 181 passing across 16 files (up from 176: five
exclusion cases in `lib/generate.test.ts`, five sentence cases in the new
`lib/period-summary.test.ts`). Lint and build are clean. All eighteen browser
checks in the plan were walked by the user on 2026-08-08 and all passed —
including the two that are the point of the work: Sinkron definisi does not
resurrect an excluded row, and deleting a month leaves Belanja and the
definitions untouched.

**Still not covered.** `lib/queries/` remains untested, `deleteItem`,
`clearExclusions` and `deletePeriod` included, for the reasons already stated
above. `deleteItem` is read-modify-write on the array, so two simultaneous
deletions could lose one exclusion; single user, one tab, and every deletion
sits behind a confirmation, so this was accepted rather than solved with an RPC.
The failure mode is a resurrected row on the next sync, not lost data.
