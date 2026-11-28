# 0011: M3 house rules: resources, the ladder, outings and crafting

Date: 2026-11-27
Status: accepted (the flagged numbers are open for the players to change)

## Context

M3 is "Your house": resources, the upgrade ladder, house scene text, rooms mapped to the real home, Tier 1 expeditions with stamina, and cookfire and kitchen crafting. This slice is the rules and content only. The database, nightly job and screens follow.

## Decisions

**Everything shared changes at night.** Upgrades and crafts are ordered during the day and settled in the house's nightly close (`closeHouseNight`), alongside the day's income, outing loot and meals. One writer means two players can never race for the last coins, and it fits the design's rhythm: the workers come while you sleep, and the stew is ready by morning. The order is fixed: income, outings, meals, building, crafting, so tonight's income can pay for tonight's orders.

**Outings play live and pay at night.** An outing is seeded by player, date and outing number. The app resolves each choice with the same pure engine (`resolveOuting`: a d20, plus 2 per tier of a Skill in the choice's theme, plus 1 per 4 levels) and shows the result at once. The nightly job replays the same record to grant the loot, so the preview and the payout always agree, with no server round-trip during play. An outing costs stamina when it starts. If the nightly replay finds the player didn't have the stamina, that outing pays nothing.

**Stamina is per player, the four currencies are the house's.** A log earns coins always, plus supplies, mana or goodwill by domain, and stamina for rides, lifting, PT, eating well and sleep. All are scaled by tier. Stamina caps at about two days' worth, as the design says.

**Bad-luck protection.** Every finished outing without a rare find raises the next one's chance. Rare finds are trophies for now.

**Crafting** turns supplies and coins into stash items overnight. Mastery counts uses: Novice under 5, Skilled from 5, Master from 15. Skilled and Master have a chance of a fine result (one extra). Food can be eaten at night for stamina. The guest platter is for M4's visitors.

**Rooms** look tidy, dusty (a chore 1-3 days overdue) or cluttered (4+). It's only a look, as the design says.

**The garden is an optional rung.** The design's ladder puts the garden (needs a Spirit Skill) before the guest room and the door to the Inn. Taken literally, a house with no Spirit Skill could never open the door, and M4's visitors depend on it. Skill-gated upgrades are therefore optional: nothing above them waits on them.

**Saved state.** `PlayerState` is now version 2 (stamina and pity, migrated from v1). `HouseState` starts at version 1.

**Flagged: numbers the design leaves open.**

| Question | M3 answer |
| --- | --- |
| Coins per log (tiny / normal / big) | 1 / 3 / 6 |
| Supplies (Nourish, Home, Strength, Craft) | 1 / 2 / 4 |
| Mana (Mind, Spirit, Recovery), goodwill (Bonds) | 1 / 2 / 3 each |
| Stamina (Endurance, Strength, Recovery, Nourish, Rest) | 2 / 5 / 8, capped at 30 |
| Outing cost and length | 10 stamina, 3 events |
| Rare chance | 5% plus 5% per dry outing |
| Upgrade costs (coins / supplies / mana) | kitchen 100/50, yard 300/150, shed 550/250, garden 400/150/60, guest room 900/400/80 |
| Fine result chance (Novice / Skilled / Master) | 0 / 25% / 50% |

## What the simulator found (`pnpm sim`, new house section)

Two steady players order the next upgrade every night and each go out once a day when stamina allows:

- the kitchen is built on day 4
- the training yard by week 2
- the supply shed in week 4
- the guest room and door in week 7.7, close to when steady play reaches Level 10

Outings bring home about half their coins at that pace. That's fine while habits are the only source of stamina, but it's worth watching in the playtest. The snapshot was updated for this intended change. The level curve didn't move, because none of this touches class XP.

## Consequences

- `NightInput.house` carries what the house's night settled for a player (stamina spent and eaten, pity) into their `closeDay`.
- The nightly job will now process a house's day once every housemate has closed it: the house's night first, then each player, then the morning.
- 18 hand-written Tier 1 events are the starting pool. Claude-written nightly decks can add to it later.
