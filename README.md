# Inn of Small Steps

A habit-building game set in the world of *The Wandering Inn*, for two players.
Your real habits are your characters' lives in Liscor, and the System only levels you when you sleep.

- Design: [docs/design.md](docs/design.md)
- Decisions: [docs/decisions/](docs/decisions/)
- Working rules for Claude Code: [CLAUDE.md](CLAUDE.md)

Personal fan project; not affiliated with the author of *The Wandering Inn*.

## Status

M0 (the level-curve simulator) is done. M1, the habit core, is in progress: the habit rules and the database are in; the Expo app and the Apple Health import are next.

```bash
pnpm install
pnpm sim        # the 365-day level curve
pnpm check      # typecheck, lint, test, sim
```

The database needs Docker running (OrbStack or Docker Desktop):

```bash
pnpm db:start   # local Postgres with the migrations applied
pnpm db:test    # pgTAP access-rule tests
pnpm db:types   # regenerate packages/schema/src/database.ts after a migration
```
