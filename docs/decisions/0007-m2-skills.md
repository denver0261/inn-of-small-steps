# 0007: M2 Skills, the Level 10 capstone and saved state

Date: 2026-11-27
Status: accepted (the flagged choices are open for the players to change)

## Context

M2 is "The System": the nightly close, Claude's narration and the morning screen. The engine has emitted `skill_slot` events since M0, but a slot never gave anything. This first M2 slice makes Skills real. It lives entirely in the engine and content packages; the database, the nightly job and the screens come in the next slices.

## Decisions

**Skills are data.** `packages/content/src/skills.ts` holds the catalog. Each entry has a theme domain, a type, an effect with one number per tier, fallback names and a one-line summary. The engine runs three kinds of effect:

- `xp_bonus` (passive): +n% XP on logs in some domains.
- `after_miss_bonus` (triggered): +n% on a habit's first log while it has misses waiting, the same moment the rusty bonus pays.
- `grace_day` (active): n charges a week to mark a missed habit done for the day. It earns no XP, but the day counts as done, so it isn't a miss and consistency holds. Charges refill each Monday.

House, partner and expedition Skills arrive with M3 and M4, when there's something for them to act on.

**How a slot picks its Skill.** The design says the domain you did most in the last 14 days sets the theme. Counting raw sessions let daily habits (tidying, eating well) beat a [Rider]'s three rides a week every time, so riders never got a riding Skill. The engine instead scores each domain the way XP weighs it (focus domains count 1 per session, others half). It then divides by 1 + the tier already held in that theme. What you do most still leads, but a theme you've just grown passes the next slot to something else. Holding a Skill in the winning theme upgrades it ("same theme upgrades, not stacks") until it's maxed. Draws within a theme are seeded by player id and date, so a night always closes the same way.

**Level 10.** It doesn't grant a plain Skill. It offers 1 of 2 Skills in different themes, plus a class evolution: 3 qualifiers, each from a domain you actually did, strongest first. You get one reroll, which offers the next three. Picks are made in the app and applied when that day closes. The evolution's domain joins the class's focus domains, so its habits earn full XP from then on. Claude writes the evolution's name; the fallback is "[Qualifier Class]", e.g. "[Hearth Rider]".

**Saved state is versioned.** `PlayerState.version` is 1, and `migrateState` upgrades an unversioned (M0-shaped) save. The state round-trips through JSON because the database will store it as `jsonb`.

**The XP cap.** All Skill XP bonuses on one log together cap at +50% (`Tuning.skillXpCap`), as the design says.

**Flagged: values the design leaves open.**

| Question | M2 answer | Why |
| --- | --- | --- |
| Passive XP bonus per tier | +10 / 15 / 20% (two-domain Skills +5 / 10 / 15%) | Noticeable without moving Level 10 much: steady play reaches it at 6.9 weeks instead of 7.0. |
| After-miss bonus per tier | +25 / 35 / 50% | The design's "counts double" would break the +50% cap, so the top tier is the cap. |
| Grace charges per week | 1 / 1 / 2 | Covers one bad day a week; the third tier doubles it. |
| Theme score | path-weighted sessions ÷ (1 + held tier) | See above. Raw counts gave a [Rider] no riding Skill by Level 10. |
| Evolution reroll | the next three domains by activity | "Reroll once" without saying from what; the next three are still things you did. |

## What the simulator found (`pnpm sim`)

Steady play reaches Level 10 at 6.9 weeks (was 7.0) and earns 82 XP a day (was 79). Bursty play takes 7.9 weeks (was 8.4), and a 3-week lapse takes 9.1 weeks (was 9.6). Each profile holds four distinct Skills by Level 10, one of them upgraded, which matches the design's "about 5 Skills by Level 10" counting the capstone pick. The snapshot was updated for this intended change.

## Consequences

- `NightInput` gains optional `playerId`, `className`, `catalog`, `qualifiers` and `choices`. Without a catalog no Skills are granted, so the M0 tests and callers keep working.
- `XpFactors` gains `skill`, and `LevelEvent` gains `skill_granted`, `skill_choice_offered`, `evolution_offered`, `evolution_chosen` and `grace`. Those events are what Claude narrates.
