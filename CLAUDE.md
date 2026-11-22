# Inn of Small Steps
A Wandering Inn habit game for two players. Claude Code is the code owner.
Design: docs/design.md (source of truth). Decisions: docs/decisions/.

## Layout
apps/mobile (Expo) · packages/engine (pure rules) · packages/content (data)
packages/schema (zod) · supabase/ (migrations, nightly job) · prompts/

## Rules
- Game math lives only in packages/engine as pure functions with tests. No I/O and no Date.now(): use the clock module.
- New classes, Skills, quests, events and loot are content files, not engine code.
- Claude API output is narration only: validate with zod, never trust numbers from it. Tests never call the live API.
- Every nightly run is idempotent and produces a level-up even if the API call fails.
- Database changes only through new migrations.
- Before finishing a task: pnpm typecheck && pnpm lint && pnpm test && pnpm sim.
- If behavior changed, update docs/design.md and add a note in docs/decisions/.
- Small PRs, conventional commits, feature flags for unfinished work.
- Scope is Levels 1-10. Don't build anything in the design's "Later" section.
- Health data stays minimal: workout type, start/end, duration, distance, sleep duration. No heart rate or raw samples.

## Build order
Milestones M0-M2 only until the two-week playtest passes (see "Cut line" in docs/design.md).
