# 0006: Build through M4 before the playtest

Date: 2026-11-27
Status: accepted

## Context

docs/design.md has a cut line: build M0 to M2, play for two weeks, and build M3 (the house) and M4 (visitors and quests) only if waking up to level-ups makes both players want to do their habits. CLAUDE.md repeated it as "Milestones M0-M2 only until the two-week playtest passes."

After M1 shipped, Kyle asked to keep going: "I'd just go to M4 unless you run into major issues. You own this game so try to make a good base for yourself."

## Decision

Build M2, M3 and M4 in that order, one milestone per PR (or a few small PRs each), then run the two-week playtest on the fuller game. The playtest still happens; it now tests the whole M0-M4 loop instead of levels alone.

Everything else about scope stays: Levels 1 to 10 only, nothing from the design's "Later" section, and no M5 (Tier 2 expeditions, delves, workbench and alchemy) or M6 (opening the game to friends).

"Major issues" that would stop the build and go back to Kyle: anything that needs money or an account (a Claude API key in production, an Apple Developer account), a balance problem the simulator can't settle, or a design question the doc leaves to the players.

## Consequences

- CLAUDE.md's build order now says M0-M4.
- If the playtest says levels alone don't pull the players in, the house and visitors are already there to try. If it says the opposite, M3 and M4 may need trimming rather than adding.
