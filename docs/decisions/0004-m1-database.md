# 0004: M1 database and access rules

Date: 2026-11-22
Status: accepted (the flagged values are open for the players to change)

## Context

The second M1 slice (see [0003](0003-m1-habit-rules.md)) is the Supabase schema: the tables the app will read and write, and the row-level security that keeps one player's private data away from the other and from strangers.

## Decisions

**Tables:** `households`, `players`, `household_invites`, `rooms`, `habits`, `goals`, `day_closes`, `chores`, `habit_logs`, `health_workouts`, `pauses`, all in one migration (`supabase/migrations/20261122000000_m1_habit_core.sql`). Column values mirror the zod enums in `packages/schema`. `pnpm db:types` generates `packages/schema/src/database.ts` from the migrations, and CI fails if it's out of date.

**Who sees what:**

| Data | You | Your housemate | Anyone else |
| --- | --- | --- | --- |
| Player row, habits, goals, logs | read and write | read only | nothing |
| Rooms and chores | read and write | read and write | nothing |
| Apple Health workouts, pauses | read and write | nothing | nothing |
| Closed days | read only (the nightly job writes them) | nothing | nothing |

Pauses are private because their reason can be health-related ("PT setback").

**Rules the database enforces:**

- A log can be added, changed or removed only while its day is open, meaning no `day_closes` row exists for that day or a later one. That's the design's "retroactive logging until sleep."
- Rides and lifting can't be tapped in. A habit with `allow_tap = false` only accepts Apple Health logs, and each workout id logs once per player.
- You join a house only through `create_household` or `accept_invite`. A player can't edit their own `household_id` or `started_on` directly.
- Deleting an account (the auth user) deletes the player and everything they own. Chores they finished keep the chore but lose the "done by."

**Tests.** `supabase/tests/database/access.test.sql` runs 29 pgTAP checks as three real users (two housemates and a stranger). They cover the rules above. Deliberately leaking workouts to housemates makes the suite fail. CI runs it on every PR in a `database` job.

**Supabase CLI.** It's pinned as an npm dev dependency (`supabase@3.0.0`, the newest release at least 14 days old), so the local machine and CI use the same version under the repo's `minimumReleaseAge` rule. Run it through `pnpm db:*`, not a globally installed `supabase`.

**Flagged: values the design leaves open.**

| Question | M1 answer | Why |
| --- | --- | --- |
| How long is an invite link good for? | 7 days, one use | Long enough to get around to it; one use so a shared link can't add strangers. |
| How many players can a house hold? | no limit in the database | Two players for now; friends get their own houses (M6), so a cap can wait. |
| Default sleep time | 22:30 | A placeholder; set on day one. It drives the nightly job in M2. |

## Consequences

- The nightly job (M2) writes `day_closes` with the service role. Writing that row is what locks a day.
- Online dev and prod Supabase projects get this migration with `supabase db push` once the players create them. No keys are in the repo.
