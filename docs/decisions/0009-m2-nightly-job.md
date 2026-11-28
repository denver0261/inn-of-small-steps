# 0009: M2 nightly job and its tables

Date: 2026-11-27
Status: accepted (the flagged choices are open for the players to change)

## Context

The design's nightly pipeline closes each player's day, runs the engine, has Claude write one morning per house, and stores it. It names Supabase edge functions as the home for that job. M1 turned the local edge runtime off, and edge functions run on Deno, which can't import the pnpm workspace packages as they are.

## Decisions

**The job is a Node script, `packages/night`, run on a schedule.** It imports the engine, content and narrator exactly as the app and simulator do. `pnpm night` runs it once with `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. `pnpm night:local` runs it against the local stack. In production, `.github/workflows/nightly.yml` runs it every 15 minutes. That workflow is off until the repository variable `NIGHTLY_ENABLED` is `true` and the secrets exist. A run is idempotent, so running often is safe and a missed run just catches up.

**What a run does:**

1. Closes every day whose 4:00 has passed (`day_closes.source = 'auto'`), including days skipped while the job didn't run.
2. Runs the engine on each closed, unprocessed day, oldest first. `record_night` saves the state, the events and "processed" in one transaction.
3. For each house, writes the morning for a day once every housemate who had started by then has closed and processed it. `record_story` saves the scene, the System messages and the Skill and class names in one transaction. A second morning for the same day is ignored.

One player's failure is reported and never blocks the other player.

**"Go to sleep."** `go_to_sleep()` closes today for the calling player at once (`source = 'sleep'`). That locks today's logs and choices, as the M1 rules already do for closed days. The next run levels them. The morning still waits for the housemate, as the design says.

**New tables:**

- `player_states` (engine state as `jsonb`, private)
- `level_events` (each day's events and the state after them, private)
- `night_choices` (Level 10 picks, the evolution reroll and grace days; written by the player while the day is open)
- `story_entries` (the house's morning, with its source and prompt version)
- `system_messages`, `skill_names`, `evolution_names` (shared with the house)

pgTAP covers the new access rules (16 checks).

**Row mapping moved.** `apps/mobile/src/data/rows.ts` moved to `packages/schema/src/rows.ts` (subpath `@inn/schema/rows`) so the job and the app map rows the same way. The app re-exports it.

**Flagged:**

| Question | M2 answer | Why |
| --- | --- | --- |
| How often does the job run? | every 15 minutes | Mornings arrive within 15 minutes of 4:00 or of "Go to sleep", and GitHub's schedule is free for public repos. |
| Does the morning wait for a housemate who's still awake? | yes, until they sleep or 4:00 | The design says the narration call waits for both. Each player's own levels are computed at once, but they show up with the morning. |
| How many earlier scenes go into the prompt? | 7 | The design's "last 7 story entries". |

## Verified

Against the local Supabase stack, with two seeded players who started two days earlier, one run closed both days, leveled both players, granted each a Skill and wrote two mornings (templates, since there's no API key). A second run changed nothing.

## Consequences

- The design's architecture section now says the nightly job is a scheduled Node script.
- Push notifications for the morning wait until there's an Apple Developer account. The app shows the morning when it opens.
