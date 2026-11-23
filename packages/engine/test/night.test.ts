import { describe, expect, it } from "vitest";
import { addDays, closeDay, DEFAULT_TUNING as T, NEW_PLAYER_STATE } from "../src/index.ts";
import { baseInput, daily, log, MON, run, weekly, xpEvents } from "./fixtures.ts";

const day = (n: number) => addDays(MON, n);

describe("XP per log", () => {
  it("pays the tier, full on path and half off path", () => {
    const { events } = run([baseInput(MON, [log("ride", MON), log("tidy", MON), log("ride", MON, { kind: "tiny" })])]);
    const [ride, tidy, tiny] = xpEvents(events);
    // Day one, done: the 14-day rate is 100%, so consistency is already 1.5.
    expect(ride?.factors).toMatchObject({ path: 1, consistency: 1.5 });
    expect(ride?.amount).toBe(Math.round(25 * 1.5));
    expect(tidy?.factors.path).toBe(0.5);
    expect(tidy?.amount).toBe(Math.round(25 * 0.5 * 1.5));
    expect(tiny?.base).toBe(10);
  });

  it("lets a log name its own tier (a long ride is big)", () => {
    const { events } = run([baseInput(MON, [log("ride", MON, { tier: "big" })])]);
    expect(xpEvents(events)[0]?.base).toBe(50);
  });

  it("rejects a log for a habit the player does not have", () => {
    expect(() => closeDay(NEW_PLAYER_STATE, baseInput(MON, [log("ghost", MON)]), T)).toThrow(/unknown habit/);
  });
});

describe("consistency", () => {
  it("drops with misses and recovers in days, not weeks", () => {
    const days = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => baseInput(day(n), n % 2 === 0 ? [log("ride", day(n))] : []));
    const { events } = run(days);
    const last = xpEvents(events).filter((e) => e.habitId === "ride").at(-1);
    // 5 of 9 scheduled days done by day 8 -> rate 5/9.
    expect(last?.factors.consistency).toBeCloseTo(1 + 0.5 * (5 / 9));
  });

  it("leaves paused days out instead of counting them as misses", () => {
    const pauses = [{ startDate: day(1), endDate: day(5) }];
    const days = [0, 1, 2, 3, 4, 5, 6].map((n) => baseInput(day(n), n === 0 || n === 6 ? [log("ride", day(n))] : [], { pauses }));
    const { state, events } = run(days);
    expect(xpEvents(events).at(-1)?.factors.consistency).toBe(1.5);
    expect(xpEvents(events).at(-1)?.factors.rusty).toBe(0);
    expect(state.misses["ride"] ?? 0).toBe(0);
  });
});

describe("rusty bonus", () => {
  it("builds +10% per missed scheduled day, pays once, and resets", () => {
    const days = [baseInput(day(0), [log("ride", day(0))]), baseInput(day(1)), baseInput(day(2)), baseInput(day(3), [log("ride", day(3)), log("ride", day(3))]), baseInput(day(4), [log("ride", day(4))])];
    const rides = xpEvents(run(days).events).filter((e) => e.habitId === "ride");
    expect(rides.map((e) => e.factors.rusty)).toEqual([0, 0.2, 0, 0]);
  });

  it("caps at +50%", () => {
    const days = [...Array.from({ length: 9 }, (_, n) => baseInput(day(n))), baseInput(day(9), [log("ride", day(9))])];
    expect(xpEvents(run(days).events)[0]?.factors.rusty).toBe(0.5);
  });

  it("counts a weekly goal's miss only when the week ends short", () => {
    const goals = [weekly("ride", 3)];
    const days = [0, 1, 2, 3, 4, 5, 6].map((n) => baseInput(day(n), n === 2 ? [log("ride", day(n))] : [], { goals }));
    const { state } = run(days.slice(0, 6));
    expect(state.misses["ride"] ?? 0).toBe(0);
    expect(run(days).state.misses["ride"]).toBe(2);
  });
});

describe("prescribed goals", () => {
  it("halves XP for sessions past the weekly target", () => {
    const goals = [weekly("pt", 3, true)];
    const days = [0, 1, 2, 3].map((n) => baseInput(day(n), [log("pt", day(n))], { goals }));
    const pts = xpEvents(run(days).events);
    expect(pts.map((e) => e.factors.prescribed)).toEqual([1, 1, 1, 0.5]);
  });
});

describe("comeback bonus", () => {
  it("adds 25% to the first night back after 3+ days away", () => {
    const days = [baseInput(day(0), [log("ride", day(0))]), baseInput(day(1)), baseInput(day(2)), baseInput(day(3)), baseInput(day(4), [log("ride", day(4))])];
    const comeback = run(days).events.find((e) => e.type === "comeback");
    expect(comeback).toMatchObject({ daysAway: 3 });
  });

  it("does not fire after only 2 days away", () => {
    const days = [baseInput(day(0), [log("ride", day(0))]), baseInput(day(1)), baseInput(day(2)), baseInput(day(3), [log("ride", day(3))])];
    expect(run(days).events.some((e) => e.type === "comeback")).toBe(false);
  });
});

describe("the nightly close", () => {
  it("grants Level 1 on the first night and opens a Skill slot at Level 2", () => {
    const { events } = run([baseInput(MON, [log("ride", MON, { tier: "big" })])]);
    expect(events.filter((e) => e.type === "level_up").map((e) => e.level)).toEqual([1, 2]);
    expect(events.filter((e) => e.type === "skill_slot").map((e) => e.level)).toEqual([2]);
  });

  it("is idempotent: closing the same night twice changes nothing", () => {
    const first = closeDay(NEW_PLAYER_STATE, baseInput(MON, [log("ride", MON)]), T);
    const again = closeDay(first.state, baseInput(MON, [log("ride", MON)]), T);
    expect(again.state).toBe(first.state);
    expect(again.events).toEqual([]);
  });

  it("closes skipped days as empty days so their misses still count", () => {
    const { state } = run([baseInput(day(0), [log("ride", day(0))]), baseInput(day(3))]);
    expect(state.lastClosed).toBe(day(3));
    expect(state.misses["ride"]).toBe(3);
  });

  it("only uses goals that have started", () => {
    const goals = [daily("ride", day(5))];
    const { state } = run([0, 1, 2].map((n) => baseInput(day(n), [], { goals })));
    expect(state.misses["ride"] ?? 0).toBe(0);
  });
});
