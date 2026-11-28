import { describe, expect, it } from "vitest";
import { desiredHealthLogs, toSleepSpans, toWorkout, type RawWorkout } from "../src/health/map.ts";

const raw = (over: Partial<RawWorkout> = {}): RawWorkout => ({
  uuid: "w1",
  workoutActivityType: 13,
  startDate: new Date("2027-01-05T18:00:00Z"),
  endDate: new Date("2027-01-05T18:40:00Z"),
  duration: { quantity: 2400, unit: "s" },
  totalDistance: { quantity: 15200, unit: "m" },
  sourceRevision: { source: { bundleIdentifier: "com.garmin.connect.mobile", name: "Connect" } },
  ...over,
});
const habit = (id: string, healthType: "cycling" | "strength" | "sleep") => ({ id, name: id, domain: "endurance" as const, tier: "normal" as const, tinyVersion: "x", playerId: "p1", allowTap: false, healthType });

describe("reading Apple Health", () => {
  it("maps rides and lifts with only the allowed fields, and ignores other workouts", () => {
    expect(toWorkout(raw())).toEqual({ id: "w1", type: "cycling", start: "2027-01-05T18:00:00.000Z", end: "2027-01-05T18:40:00.000Z", durationMin: 40, distanceKm: 15.2, fromGarmin: true });
    expect(toWorkout(raw({ workoutActivityType: 50, totalDistance: undefined, sourceRevision: { source: { bundleIdentifier: "com.strong", name: "Strong" } } }))).toMatchObject({ type: "strength", fromGarmin: false });
    expect(toWorkout(raw({ workoutActivityType: 37 }))).toBeUndefined(); // running
  });

  it("keeps asleep stages only", () => {
    const s = (value: number) => ({ startDate: new Date("2027-01-05T05:00:00Z"), endDate: new Date("2027-01-05T06:00:00Z"), value });
    expect(toSleepSpans([s(0), s(1), s(2), s(3), s(4), s(5)])).toHaveLength(4);
  });

  it("builds logs for the habits that come from Apple Health", () => {
    const sleep = [{ startDate: new Date("2027-01-05T05:00:00Z"), endDate: new Date("2027-01-05T12:30:00Z"), value: 3 }];
    const d = desiredHealthLogs({ workouts: [raw(), raw({ uuid: "w2", workoutActivityType: 50 })], sleep }, [habit("ride", "cycling"), habit("sleep", "sleep")], { timeZone: "America/Chicago", counted: new Set() });
    expect(d.logs.map((l) => [l.habitId, l.date, l.kind, l.tier])).toEqual([
      ["ride", "2027-01-05", "full", "big"],
      ["sleep", "2027-01-05", "full", undefined],
    ]);
    expect(d.workouts.map((w) => w.id)).toEqual(["w1"]); // no lifting habit, so the lift isn't kept
  });
});
