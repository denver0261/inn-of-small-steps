# Changelog

## M1 – Habit core (in progress)

- Pure habit rules: chore due dates and list order, chore check-off as a Home log, the 14-day consistency rate (shared with the XP multiplier), weekly pace, goal changes, habit slots, and Apple Health workout import with de-duplication and late syncs. See [decisions/0003](decisions/0003-m1-habit-rules.md).
- Supabase schema with row-level security: a shared house joined by invite, private workouts and pauses, logs locked once their day closes, rides and lifting only from Apple Health. 29 pgTAP access tests run in CI, and generated database types live in `@inn/schema`. See [decisions/0004](decisions/0004-m1-database.md).
- Expo iPhone app (development build): sign-in by emailed code, day-one setup (house, invite, path, starting habits), habits with goal changes, tap and tiny logging with undo, 14-day consistency and weekly pace, rooms and the shared chore list. See [decisions/0005](decisions/0005-m1-app.md).

## M0 – Simulator (2026-11-22)

- pnpm workspace with `@inn/schema`, `@inn/content`, `@inn/engine` and `@inn/sim`, plus GitHub Actions CI.
- Pure rules engine: XP per log, path focus, consistency, rusty bonus, weekly and prescribed goals, pauses, comeback bonus, level curve and Skill slot levels, all run by one idempotent `closeDay`.
- `pnpm sim`: 365 days for steady, bursty and lapsed players. Steady play reaches Level 10 in 7.0 weeks. See [decisions/0002](decisions/0002-m0-engine-defaults.md).
