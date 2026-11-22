# Changelog

## M0 – Simulator (2026-11-22)

- pnpm workspace with `@inn/schema`, `@inn/content`, `@inn/engine` and `@inn/sim`, plus GitHub Actions CI.
- Pure rules engine: XP per log, path focus, consistency, rusty bonus, weekly and prescribed goals, pauses, comeback bonus, level curve and Skill slot levels, all run by one idempotent `closeDay`.
- `pnpm sim`: 365 days for steady, bursty and lapsed players. Steady play reaches Level 10 in 7.0 weeks. See [decisions/0002](decisions/0002-m0-engine-defaults.md).
