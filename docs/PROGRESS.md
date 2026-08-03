# Sangu — Progress & Handoff

Last updated: 2026-08-03

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

All plan tasks are implemented. Checks at the last commit: `npm run build`
passes, `npm run lint` reports no issues, `npm test` is 43 passing across 5
files.

**Outstanding:** Task 12 step 6 — the only thing left in the plan. Log in, make
sure there is a savings goal with a target amount, generate the current month,
mark its saving item paid in `/current`, then confirm `/goals` shows the
accumulated total, the remaining amount, an estimated completion month, and the
setoran line switched to "Sudah menabung". Nothing else is known to be missing.

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

The single auth user already exists and signup is disabled in that project. The
`settings` row is seeded (base salary was set to 15.000.000 through the UI).
There is real test data: 4 accounts, 1 recurring expense, 1 installment, 1
savings goal, and periods for 2026-08 and 2026-09.

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
