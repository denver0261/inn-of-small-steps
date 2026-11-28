# 0014: M4 visitors, quests, goodwill and the Inn (rules)

Date: 2026-11-27
Status: accepted (the flagged numbers are open for the players to change)

## Context

M4 is "Visitors and shared quests": visitor templates, solo and co-op quests, goodwill, and evenings at the Wandering Inn. This slice is the rules and content. The tables, the job wiring and the screens follow.

## Decisions

**Quests measure habits the players already log.** A quest is one of:

- N logs in a domain within its days ("lift three times this week")
- a log in a domain on N days in a row ("tidy something every day for five days")
- N chores checked off

Co-op quests count both players, and solo quests only the one who accepted. Nothing new has to be tapped, so a quest is a nudge toward things you already track, which is the design's intent. The design also mentions quests creating temporary habits. That's left for later: it needs habit-slot rules and an archive step, and domain quests cover every example in the design.

**No quest touches physical therapy.** The game never raises a prescribed goal, so no visitor asks for Recovery. A content test enforces it.

**Visitors arrive at night, settle at night.** In the house's night, after crafting:

1. Tonight's answers: accept, decline, serve a guest platter, an evening at the Inn.
2. Recruits' nightly help.
3. Quests that finished (paid) or ran out (they just end, no penalty).
4. Visitors who waited long enough leave.
5. Tomorrow's knocks.

Arrivals are seeded by house and date. They're weighted toward rarer visitors as goodwill builds. The yard draws the Watch, the garden draws its gardener, and Inn folk come only after an evening at the Inn or once the door to the Inn is built. A visitor never comes twice while waiting or on a quest, and at most three wait at once.

**Goodwill is kept, not spent.** The design lists it as drawing rarer visitors and better rewards, so it accumulates and tilts the odds a little: +0.1% arrival chance per goodwill, capped, and rare visitors' weight grows by 0.01 per goodwill.

**Evenings at the Wandering Inn** are once a day per player. Each earns a little goodwill, always brings an Inn regular to the door the next morning, and shows a short scene at once. Canon characters appear only as cameos, and the prose is original.

**Recruits** stay on after certain quests and add a little to the house every night: a Watch recruit, an Antinium Worker, the old gardener.

**Party-level scaling** (the lower-level partner gets +25% on co-op rewards) isn't needed: quest rewards go to the shared house, not to a player.

**Saved state.** `HouseState` is now version 2 (visitors, quests, quests done, recruits), migrated from v1.

**Flagged: numbers the design leaves open.**

| Question | M4 answer |
| --- | --- |
| Chance a visitor knocks each night | 25% + 0.1% per goodwill, at most 60%; a second roll once the door is built |
| How long a visitor waits | 3 days |
| How many can wait at once | 3 |
| Rarity weights | common 6, uncommon 3, rare 1 + 0.01 per goodwill |
| Goodwill for an evening at the Inn | 1 |
| Quest rewards | 3-6 goodwill plus some coins, supplies or mana, per visitor |
| Recruits' nightly help | 2-3 of one resource |

## What the simulator found

Two steady players accept every visitor and spend Fridays at the Inn:

- about five visitors a week once the door is built, fewer before
- 62 quests done and 23 lapsed in 120 days
- the guest room lands in week 7.3, near Level 10

Quest rewards speed the ladder a little. The snapshot was updated for this intended change. The level curve didn't move.
