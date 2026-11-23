import { describe, expect, it } from "vitest";
import {
  activeGoal,
  addDays,
  daysBetween,
  effectiveWeeklyTarget,
  FakeClock,
  gameDate,
  isPaused,
  weekStart,
  weekday,
} from "../src/index.ts";
import { daily, MON, weekly } from "./fixtures.ts";

describe("dates", () => {
  it("does calendar arithmetic across month and year ends", () => {
    expect(addDays("2023-12-31", 1)).toBe("2024-01-01");
    expect(addDays("2024-03-01", -1)).toBe("2024-02-29");
    expect(daysBetween("2024-01-01", "2024-03-01")).toBe(60);
  });

  it("numbers weekdays from Monday", () => {
    expect(weekday(MON)).toBe(0);
    expect(weekday("2024-01-07")).toBe(6);
    expect(weekStart("2024-01-07")).toBe(MON);
  });
});

describe("goals", () => {
  it("judges each day against the goal row active then", () => {
    const goals = [weekly("pt", 3, true), weekly("pt", 2, true, "2024-01-15")];
    expect(activeGoal(goals, "pt", "2024-01-14")?.target).toBe(3);
    expect(activeGoal(goals, "pt", "2024-01-15")?.target).toBe(2);
    expect(activeGoal(goals, "pt", "2023-12-31")).toBeUndefined();
  });

  it("ends a temporary goal on its end date", () => {
    const goals = [{ ...daily("pt"), endDate: "2024-01-10" }];
    expect(activeGoal(goals, "pt", "2024-01-10")).toBeDefined();
    expect(activeGoal(goals, "pt", "2024-01-11")).toBeUndefined();
  });

  it("shrinks a weekly target by the paused days", () => {
    const pauses = [{ startDate: "2024-01-05", endDate: "2024-01-07" }];
    expect(isPaused(pauses, "pt", "2024-01-06")).toBe(true);
    expect(effectiveWeeklyTarget([weekly("pt", 3)], pauses, "pt", "2024-01-07")).toBe(2);
    expect(effectiveWeeklyTarget([weekly("pt", 3)], [], "pt", "2024-01-07")).toBe(3);
  });
});

describe("clock", () => {
  it("keeps the small hours on the previous game day", () => {
    const clock = new FakeClock(new Date("2024-01-02T09:30:00Z")); // 03:30 in Chicago
    expect(gameDate(clock, "America/Chicago")).toBe("2024-01-01");
    clock.advanceHours(1); // 04:30
    expect(gameDate(clock, "America/Chicago")).toBe("2024-01-02");
    clock.advanceDays(1);
    expect(gameDate(clock, "America/Chicago")).toBe("2024-01-03");
  });
});
