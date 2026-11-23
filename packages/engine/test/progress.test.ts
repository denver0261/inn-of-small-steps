import { describe, expect, it } from "vitest";
import { addDays, changeGoal, consistencyRate, DEFAULT_TUNING as T, habitSlots, sessionCounter, weekProgress } from "../src/index.ts";
import { daily, log, MON, weekly } from "./fixtures.ts";

describe("consistency rate", () => {
  it("is the share of the last 14 scheduled days that were done", () => {
    const logs = Array.from({ length: 14 }, (_, i) => addDays(MON, i))
      .filter((_, i) => i % 2 === 0)
      .map((d) => log("tidy", d));
    expect(consistencyRate("tidy", addDays(MON, 13), [daily("tidy")], [], sessionCounter(logs), 14)).toBe(0.5);
  });

  it("leaves out paused days and unscheduled rest days", () => {
    const weekdaysOnly = { ...daily("tidy"), days: [0, 1, 2, 3, 4] };
    const logs = [0, 1, 2, 3, 4].map((i) => log("tidy", addDays(MON, i)));
    const sunday = addDays(MON, 6);
    expect(consistencyRate("tidy", sunday, [weekdaysOnly], [], sessionCounter(logs), 14)).toBe(1);
    const pauses = [{ startDate: addDays(MON, 3), endDate: addDays(MON, 4) }];
    expect(consistencyRate("tidy", sunday, [daily("tidy")], pauses, sessionCounter(logs.slice(0, 3)), 14)).toBe(3 / 5);
  });

  it("is undefined before the habit has any goal", () => {
    expect(consistencyRate("tidy", MON, [daily("tidy", "2024-02-01")], [], sessionCounter([]), 14)).toBeUndefined();
  });
});

describe("weekly pace", () => {
  it("shows sessions done against the week's target and days left", () => {
    const logs = [log("pt", MON), log("pt", addDays(MON, 2))];
    expect(weekProgress("pt", addDays(MON, 4), [weekly("pt", 3, true)], [], sessionCounter(logs))).toEqual({
      done: 2,
      target: 3,
      daysLeft: 2,
      met: false,
    });
    expect(weekProgress("tidy", MON, [daily("tidy")], [], sessionCounter(logs))).toBeUndefined();
  });

  it("shrinks the target for a planned pause later in the week", () => {
    const pauses = [{ startDate: addDays(MON, 4), endDate: addDays(MON, 6) }];
    expect(weekProgress("pt", MON, [weekly("pt", 3)], pauses, sessionCounter([]))?.target).toBe(2);
  });
});

describe("goal changes", () => {
  it("adds a new period and keeps the old one, replacing a same-day change", () => {
    let goals = changeGoal([weekly("pt", 3, true)], weekly("pt", 2, true, "2024-01-15"));
    expect(goals.map((g) => g.target)).toEqual([3, 2]);
    goals = changeGoal(goals, weekly("pt", 1, true, "2024-01-15"));
    expect(goals.map((g) => g.target)).toEqual([3, 1]);
  });
});

describe("habit slots", () => {
  it("opens more slots after week 2", () => {
    expect(habitSlots(MON, addDays(MON, 13), T)).toBe(5);
    expect(habitSlots(MON, addDays(MON, 14), T)).toBe(8);
  });
});
