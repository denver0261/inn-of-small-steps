import { describe, expect, it } from "vitest";
import type { HealthWorkout } from "@inn/schema";
import { DEFAULT_TUNING as T, healthLogs } from "../src/index.ts";

const TZ = "America/Chicago";
const habitFor = { cycling: "ride", strength: "lift" };

/** Times are Chicago local (UTC-6 in January). */
const w = (id: string, type: HealthWorkout["type"], start: string, minutes: number, fromGarmin = true): HealthWorkout => {
  const startMs = Date.parse(`${start}-06:00`);
  return {
    id,
    type,
    start: new Date(startMs).toISOString(),
    end: new Date(startMs + minutes * 60_000).toISOString(),
    durationMin: minutes,
    fromGarmin,
  };
};

describe("Apple Health import", () => {
  it("tiers rides at 30 min and lifts at 45 min", () => {
    const logs = healthLogs(
      [w("r1", "cycling", "2024-01-01T07:00", 29), w("r2", "cycling", "2024-01-01T17:00", 30), w("l1", "strength", "2024-01-02T07:00", 45)],
      { habitFor, timeZone: TZ },
      T,
    );
    expect(logs.map((l) => [l.healthWorkoutId, l.habitId, l.date, l.tier])).toEqual([
      ["r1", "ride", "2024-01-01", "normal"],
      ["r2", "ride", "2024-01-01", "big"],
      ["l1", "lift", "2024-01-02", "big"],
    ]);
    expect(logs.every((l) => l.source === "apple_health" && l.kind === "full")).toBe(true);
  });

  it("counts overlapping workouts of one type once, preferring Garmin", () => {
    const logs = healthLogs(
      [w("app", "strength", "2024-01-01T07:00", 50, false), w("garmin", "strength", "2024-01-01T07:05", 40), w("ride", "cycling", "2024-01-01T07:10", 20)],
      { habitFor, timeZone: TZ },
      T,
    );
    expect(logs.map((l) => l.healthWorkoutId)).toEqual(["garmin", "ride"]);
  });

  it("drops a workout once it is deleted from Apple Health", () => {
    const all = [w("a", "cycling", "2024-01-01T07:00", 40), w("b", "cycling", "2024-01-01T18:00", 40)];
    expect(healthLogs(all, { habitFor, timeZone: TZ }, T)).toHaveLength(2);
    expect(healthLogs([all[0]!], { habitFor, timeZone: TZ }, T)).toHaveLength(1);
  });

  it("counts a late sync toward the next open day, labeled with its real date", () => {
    const logs = healthLogs([w("late", "cycling", "2024-01-01T07:00", 40)], { habitFor, timeZone: TZ, lastClosed: "2024-01-02" }, T);
    expect(logs).toEqual([expect.objectContaining({ date: "2024-01-03", performedOn: "2024-01-01" })]);
  });

  it("never logs a counted workout twice, and a counted record beats a late duplicate", () => {
    const counted = new Set(["app"]);
    const logs = healthLogs(
      [w("app", "cycling", "2024-01-01T07:00", 40, false), w("garmin", "cycling", "2024-01-01T07:01", 40)],
      { habitFor, timeZone: TZ, lastClosed: "2024-01-01", counted },
      T,
    );
    expect(logs).toEqual([]);
  });

  it("puts a 2 a.m. workout on the previous game day and ignores unmapped types", () => {
    const logs = healthLogs([w("night", "cycling", "2024-01-02T02:00", 20), w("lift", "strength", "2024-01-02T09:00", 20)], { habitFor: { cycling: "ride" }, timeZone: TZ }, T);
    expect(logs.map((l) => [l.healthWorkoutId, l.date])).toEqual([["night", "2024-01-01"]]);
  });
});
