# Inn of Small Steps

A habit-building game set in the world of *The Wandering Inn*, for two players.
Your real habits are your characters' lives in Liscor, and the System only levels you when you sleep.

- Design: [docs/design.md](docs/design.md)
- Decisions: [docs/decisions/](docs/decisions/)
- Working rules for Claude Code: [CLAUDE.md](CLAUDE.md)

Personal fan project; not affiliated with the author of *The Wandering Inn*.

## Status

M0 (the level-curve simulator) is done. Next is M1, the habit core: the Expo app, accounts, habits and goals, and the Apple Health import.

```bash
pnpm install
pnpm sim        # the 365-day level curve
pnpm check      # typecheck, lint, test, sim
```
