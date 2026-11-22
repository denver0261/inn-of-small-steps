# 0002: M0 engine and simulator

Date: 2026-11-22
Status: accepted (the flagged numbers are open for the players to change)

## Context

M0 asks for a script that runs 365 fake days of logs through the XP rules and prints the level curve, so the numbers get tuned before any UI. In a few places docs/design.md says what should happen but not how much. M0 needs an answer for each, so this record gives one and flags it.

## Decisions

**Scope of M0.** Includes the pnpm workspace, `packages/schema` (zod), `packages/content` (the 9 class paths), `packages/engine` (pure rules plus the clock module), `packages/sim`, and GitHub Actions running `typecheck`, `lint`, `test` and `sim`. The Expo app, HealthKit and Supabase move to M1, the first milestone that uses them.

**Implemented as written in the design:** tier XP 10/25/50; half XP off path; `20 · L^1.8`; a consistency multiplier from 1.0 to 1.5 over 14 days, judged against each day's active goal; rusty bonus of +10% per miss, capped at +50%, paid on the next log and then reset; weekly goals counting a miss only when the week ends short; a comeback bonus of +25% after 3+ days away; paused days counting as neither done nor missed, with weekly targets shrinking to match; levels never lost.

**Engine shape.** `closeDay(state, input, tuning)` is the whole nightly rule. It is pure and returns `LevelEvent`s. Closing a night that is already closed returns the same state with no events, which makes it idempotent. Skipped nights are closed first as empty days, so a missed auto-close can't erase a miss. All balance numbers live in one `Tuning` object passed in from outside, so the simulator can try other values without changing engine code. ESLint blocks `Date.now()`, `new Date()`, `Math.random()`, `fetch`, `process` and `console` inside the engine.

**Flagged: values the design leaves open.**

| Question | M0 answer | Why |
| --- | --- | --- |
| How much does a prescribed session past target earn? | 50% | "Reduced XP" without a number; half matches the off-path rule. |
| Which levels open a Skill slot? | 2, 4, 6, 8, 10 | "Most even levels and always at 10"; gives the ~5 Skills by Level 10 the design expects. |
| How far does a paused week shrink a weekly target? | `round(target × live days / 7)` | 3x a week with 3 days paused becomes 2. |
| Is a brand-new habit's consistency rate 0 or its true rate? | true rate over days it existed | A habit done on its first day starts at 1.5x. Counting earlier days as misses would punish new habits. |
| When does Level 1 arrive? | the first night, at 0 XP | "The first night grants your class." |

## What the simulator found (`pnpm sim`)

The [Rider] profile uses the design's core habits: rides 3x a week, lifting 2x, prescribed PT 3x, eating well and tidying daily, and sleep from week 3.

- **Steady (85% follow-through): Level 10 on day 49, exactly 7.0 weeks, at 79 XP a day.** The design's target is about 7 weeks at about 75 XP a day, so the current numbers hit it and nothing was retuned.
- **Bursty** play reaches Level 10 in 8.4 weeks. A **3-week lapse** pushes it to 9.6 weeks, about 2.5 weeks behind steady, and no level is lost along the way.
- **Early levels are very fast.** Level 2 comes on night 1, Level 4 by day 4 and Level 5 by day 7, so the first week brings four level-ups. That fits "early levels come fast", but it also means the first week's mornings carry most of the excitement. **This is worth watching in the two-week playtest.**

## Consequences

- The simulator's report is a committed snapshot (`packages/sim/test/__snapshots__/`), so any balance change shows up as a diff in a PR. Run `pnpm test -u` only for an intended change, and add a decision note saying why.
- Skills, conditions and house resources aren't in the engine yet. They arrive with M2 (Skills) and M3 (house), so the XP Skill cap (+50%) has nothing to cap until then.
