import fc from "fast-check";
import { describe, expect, it } from "vitest";
import type { HabitLog } from "@inn/schema";
import { addDays, closeDay, DEFAULT_TUNING as T, NEW_PLAYER_STATE, type PlayerState } from "../src/index.ts";
import { baseInput, daily, MON, weekly } from "./fixtures.ts";

const HABITS = ["ride", "tidy", "pt"] as const;
const goals = [daily("ride"), daily("tidy"), weekly("pt", 3, true)];

/** Up to 60 days; each day logs a random subset of habits, some tiny, some big. */
const season = fc.array(
  fc.record({
    logs: fc.array(fc.record({ habit: fc.constantFrom(...HABITS), kind: fc.constantFrom("full", "tiny"), big: fc.boolean() }), { maxLength: 5 }),
    pauseTidy: fc.boolean(),
    skip: fc.boolean(),
  }),
  { minLength: 1, maxLength: 60 },
);

type Season = typeof season extends fc.Arbitrary<infer T> ? T : never;

function play(days: Season, check: (before: PlayerState, after: PlayerState, i: number, pausedTidy: boolean) => void) {
  let state = NEW_PLAYER_STATE;
  const pauses = days.flatMap((d, i) => (d.pauseTidy ? [{ habitIds: ["tidy"], startDate: addDays(MON, i), endDate: addDays(MON, i) }] : []));
  days.forEach((d, i) => {
    if (d.skip && i < days.length - 1) return; // a missed auto-close, filled in by the next one
    const date = addDays(MON, i);
    const logs: HabitLog[] = d.logs.map((l) => ({ habitId: l.habit, date, kind: l.kind, source: "tap", ...(l.big ? { tier: "big" } : {}) }));
    const r = closeDay(state, baseInput(date, logs, { goals, pauses }), T);
    for (const e of r.events) if (e.type === "xp" || e.type === "comeback") expect(e.amount).toBeGreaterThanOrEqual(0);
    check(state, r.state, i, d.pauseTidy);
    state = r.state;
  });
}

describe("invariants over random seasons", () => {
  it("levels and total XP never go down", () => {
    fc.assert(
      fc.property(season, (days) =>
        play(days, (before, after) => {
          expect(after.progress.level).toBeGreaterThanOrEqual(before.progress.level);
          expect(after.progress.totalXp).toBeGreaterThanOrEqual(before.progress.totalXp);
        }),
      ),
    );
  });

  it("a paused day is never a miss", () => {
    fc.assert(
      fc.property(season, (days) =>
        play(days, (before, after, i, pausedTidy) => {
          if (pausedTidy && after.lastClosed === addDays(MON, i) && before.lastClosed === addDays(MON, i - 1)) {
            expect(after.misses["tidy"] ?? 0).toBeLessThanOrEqual(before.misses["tidy"] ?? 0);
          }
        }),
      ),
    );
  });

  it("the consistency multiplier stays within 1.0 to 1.5 and rusty within its cap", () => {
    fc.assert(
      fc.property(season, (days) => {
        let state = NEW_PLAYER_STATE;
        days.forEach((d, i) => {
          const date = addDays(MON, i);
          const logs: HabitLog[] = d.logs.map((l) => ({ habitId: l.habit, date, kind: l.kind, source: "tap" }));
          const r = closeDay(state, baseInput(date, logs, { goals }), T);
          for (const e of r.events) {
            if (e.type !== "xp") continue;
            expect(e.factors.consistency).toBeGreaterThanOrEqual(1);
            expect(e.factors.consistency).toBeLessThanOrEqual(1.5);
            expect(e.factors.rusty).toBeLessThanOrEqual(0.5);
          }
          state = r.state;
        });
      }),
    );
  });
});
