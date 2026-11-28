# 0017: Apple Health import (rides, lifts and sleep)

Date: 2026-11-28
Status: accepted (the flagged values are open for the players to change)

## Context

The last M1 slice: rides and lifting come only from Apple Health (the design says never manual entry), with Garmin syncing to Apple Health. Decision 0003 built the workout rules (`healthLogs`) and left sleep for later. The design's sleep row: 7+ hours is normal, under 6 is tiny, and sleep feeds stamina and the Rest domain.

## Decisions

**Library.** `@kingstinct/react-native-healthkit` 16.2.0 (with `react-native-nitro-modules` 0.37.2), both past the 14-day release-age rule. Its Expo config plugin adds the HealthKit entitlement and usage text. Background delivery is off: the app syncs when it's open.

**What's read.** Workouts and sleep analysis only. From a workout the app keeps its type (cycling, or functional or traditional strength training), start, end, duration, distance and whether Garmin recorded it. From sleep it uses only the total minutes asleep (in-bed and awake time are left out). No heart rate or raw samples are read, as CLAUDE.md requires. The workouts behind logs are kept in `health_workouts`, which only their owner can see.

**When it syncs.** Today syncs when it comes into view, when the app returns to the foreground, and right before "Go to sleep", so a late evening ride counts before the day locks. The first sync shows a "Connect Apple Health" card that opens iOS's permission sheet.

**How it syncs.** Each sync reads a week before the first open day and computes what the open days' Apple Health logs should be. Workouts go through the existing `healthLogs`, sleep through the new `sleepLogs`. `planHealthSync` then removes logs whose record left Apple Health and adds new ones, matching by Apple Health id. Closed days are never touched, and records already counted in a closed day aren't counted again.

**Sleep** (`sleepLogs` in the engine):
- Asleep spans are merged, so a watch and a phone recording the same night count once.
- A night belongs to the game day its sleep ends on. Last night's sleep counts toward tonight's close, as the design says.
- Sleep for a day that already closed counts toward the next open day, labeled with its real date, like a late workout.
- One log per night, with the Apple Health id `sleep:<date>`.

A habit is logged by sleep when its `health_type` is `sleep` (new migration). The Habits screen offers "Apple Health sleep".

**Trying it without a device.** Development builds also ask to write workouts and show a "Dev: add a 40-minute ride to Apple Health" button on Today. Release builds don't ask, but the usage text for writing is in `app.json`; remove it before the first TestFlight build.

**`ios/` must be regenerated after adding a native plugin.** `ios/` is git-ignored and `expo run:ios` doesn't rebuild an existing one. Run `pnpm exec expo prebuild --platform ios` first, or HealthKit fails with "Missing com.apple.developer.healthkit entitlement".

**Flagged:**

| Question | Answer | Why |
| --- | --- | --- |
| Sleep of 6 to 7 hours | tiny | The design says 7+ is normal and under 6 is tiny; it leaves 6-7 open, and tiny keeps "normal" meaning a full night. |
| Shortest sleep that logs | 1 hour | So a nap or a stray sensor reading doesn't log the habit. |
| How far back a sync looks | 7 days before the first open day | Covers a watch that didn't sync for a week; anything older is ignored. |
| Steps | not imported | The design lists steps for import but gives them no habit, tier or reward. They can come with a habit that uses them. |

## Checked in the Simulator

On a fresh Simulator Apple Health:
- The "Connect Apple Health" card opened iOS's sheet, which listed only Workouts and Sleep to read.
- The dev button saved a 40-minute ride. It came in as a big Biking log, and its workout was kept with only type, times and duration.
- Switching tabs and back didn't import it twice.
- After "Go to sleep" and `pnpm night:local`, the ride's XP (65) leveled the player.

**A nightly-job bug found on the way.** The job closed days only after the last closed day. A player who pressed "Go to sleep" before the job had ever closed their earlier days left those days open for good: never counted, and still editable. The job now closes every unclosed past day in the last 60 days, so they're settled in order. A job test covers it.

## Not verified

Only the Simulator's Apple Health has been read. A real Garmin-to-Apple-Health ride, and real watch sleep stages, should be checked on a phone in the first days of the playtest.
