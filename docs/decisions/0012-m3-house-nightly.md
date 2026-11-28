# 0012: M3 house tables and the nightly job by household

Date: 2026-11-27
Status: accepted

## Context

Decision 0011 settled the house's rules. This slice stores the house, takes the day's outings and orders, and runs the house's night in the nightly job.

## Decisions

**New tables:**

- `house_states` and `house_events`, both shared with the house.
- `outings` (player, date, index, choices). Played and seen by the house, writable only by its player while their day is open.
- `house_orders` (build, craft or eat, by id). Added or cancelled by their player while their day is open.

`record_house_night` writes the state and the night's events atomically. pgTAP covers it (12 checks).

**An outing row holds choices only.** The seed and the events are derived from (player, date, index) by the same `outingSeed` and `planOuting` the app uses. Editing a row can't produce a better outing. A player who starts outings without the stamina gets nothing for them at night.

**The job settles a house's day once every housemate has closed it**, in this order:

1. The house's night (`closeHouseNight`), unless it's already recorded.
2. Each player's `closeDay`, with what the house settled for them (stamina spent and eaten, pity).
3. The morning.

The house's night stores what it settled per player. If a run dies between steps 1 and 2, the next run reads those results back instead of recomputing them. A test covers that crash. A player with no house still closes on their own.

This changes M2's behavior: an early sleeper's levels used to be computed at once, and now wait for the housemate. Nobody sees the difference, because levels only show with the morning, which already waited.

**The morning hears the house's news.** Plain sentences ("Working kitchen is finished overnight.", "Floodplains stew is ready.", a rare find) go to Claude as `houseNews` and are appended to the template scene. The prompt moved to `prompts/system-v2.md` to ask for them. v1 stays for the record.

## Verified

Against the local stack, two seeded players over two nights: income landed in the house, a stew order was crafted overnight (supplies and coins add up), an outing without enough stamina was refused, and the stew made the morning's scene.
