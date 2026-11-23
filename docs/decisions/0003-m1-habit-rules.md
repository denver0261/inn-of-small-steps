# 0003: M1 habit rules (chores, consistency, Apple Health import)

Date: 2026-11-22
Status: accepted (the flagged numbers are open for the players to change)

## Context

M1 is "Habit core": two accounts, habits with dynamic goals, a shared chore list, logging, consistency rates and Apple Health import for rides and lifting. That is too much for one PR, so M1 lands in slices:

1. **Pure rules** (this record): chore due dates and list order, chore check-off, the 14-day consistency rate, weekly pace, goal changes, habit slots, and turning Apple Health workouts into logs.
2. **Supabase**: migrations for players, a shared house, habits, goals, logs, chores and pauses, with row-level security so health details stay visible only to their owner.
3. **Expo app**: sign-in for two players, invite to the house, habits and goals, chore list, logging, consistency screen.
4. **HealthKit**: a development build that reads cycling and strength workouts and feeds them through `healthLogs`.

## Decisions

**Implemented as written in the design:** rides of 30+ min and lifts of 45+ min are big, shorter ones normal; overlapping workouts of one type count once, preferring Garmin's record; a workout deleted before its day closes drops out; a workout that syncs after its day closed counts toward the next close, labeled with its real date (`performedOn`); 5 active habits at first, more after week 2; changing a goal adds a new goal period and leaves the old one; checking off a chore logs it at the chore's size for whoever did it; scheduled rest days and paused days are left out of the consistency rate.

**Engine shape.** The UI's consistency rate and the night's consistency multiplier now share one function, `consistencyRate`, so the number the players see is the number the XP uses. The simulator report did not change. `healthLogs` is pure: the app calls it with every workout currently in Apple Health and replaces the open days' Apple Health logs with the result, which is how deletion works. Already-counted workouts win any duplicate check, so a late duplicate from a second app can't count a closed session again. `HealthWorkout` holds only id, type, start, end, duration, distance and a `fromGarmin` flag for picking between duplicates.

**Flagged: values the design leaves open.**

| Question | M1 answer | Why |
| --- | --- | --- |
| How many habit slots open after week 2? | 8 (`Tuning.habitSlots.later`) | "More slots open after week 2" without a number; 8 leaves room for quests later without crowding. |
| When does a new chore first come due? | the day it's added (weekly chores: their first set day from then) | A chore you just wrote down is usually one that needs doing. |
| Does "every N days" count from the due date or from when it was done? | from when it was last done | Doing it late shouldn't make the next one come back early. |
| What counts as overlapping workouts? | same type and their time ranges intersect | The design's "same type that overlap in time", read literally. |
| A second goal change on the same day? | replaces that day's row | Fixing a typo shouldn't create a one-day goal period. |

**Left for M2.** The rusty bonus on overdue chores, step-up and step-down goal offers, and ramps all need the nightly job to judge weeks, so they come with M2. Steps and sleep import also wait for M2, since M1 asks only for cycling and strength.

## Consequences

- Tier thresholds for workouts and habit slot counts are in `Tuning`, so the sim can try other values.
- Slices 2 to 4 need a Supabase project and an Apple Developer account; see the PR for what the players need to set up.
