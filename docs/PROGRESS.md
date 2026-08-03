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
| 7. App shell, nav, PWA | ✅ done |
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
