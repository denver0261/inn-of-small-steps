import type { Goal, Habit, HabitLog, LocalDate, Tier, Weekday } from "@inn/schema";

/** A seeded generator, so every run of the simulator prints the same curve. */
export type Rng = () => number;

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * A [Rider] with the design's core habits: rides and lifting from Apple Health, PT as a
 * prescribed 3x/week goal, eating well and tidying as daily one-taps. Sleep joins at
 * week 3, when more habit slots open.
 */
export const HABITS: readonly Habit[] = [
  { id: "ride", name: "Ride", domain: "endurance", tier: "normal", tinyVersion: "10 min spin" },
  { id: "lift", name: "Lift", domain: "strength", tier: "normal", tinyVersion: "one set" },
  { id: "pt", name: "Physical therapy", domain: "recovery", tier: "normal", tinyVersion: "one exercise" },
  { id: "eat", name: "Eat well", domain: "nourish", tier: "normal", tinyVersion: "one good thing" },
  { id: "tidy", name: "Tidy", domain: "home", tier: "normal", tinyVersion: "one surface" },
  { id: "sleep", name: "Sleep", domain: "rest", tier: "normal", tinyVersion: "6 hours" },
];

export const FOCUS = ["endurance"] as const;

export function goals(start: LocalDate, sleepStart: LocalDate): Goal[] {
  const base = { startDate: start, prescribed: false } as const;
  return [
    { ...base, habitId: "ride", period: "week", target: 3 },
    { ...base, habitId: "lift", period: "week", target: 2 },
    { ...base, habitId: "pt", period: "week", target: 3, prescribed: true },
    { ...base, habitId: "eat", period: "day", target: 1 },
    { ...base, habitId: "tidy", period: "day", target: 1 },
    { ...base, habitId: "sleep", period: "day", target: 1, startDate: sleepStart },
  ];
}

/** Which weekdays the player plans each weekly habit for. 0 = Monday. */
const PLAN: Record<string, readonly Weekday[]> = {
  ride: [1, 3, 5],
  lift: [0, 4],
  pt: [0, 2, 4],
};

export interface Profile {
  id: string;
  description: string;
  /** Chance of following through on a planned habit on day `n` (0-based). */
  adherence: (n: number) => number;
}

export const PROFILES: readonly Profile[] = [
  { id: "steady", description: "follows through 85% of the time, every week", adherence: () => 0.85 },
  {
    id: "bursty",
    description: "10 strong days (95%), then 5 slack days (15%), repeating",
    adherence: (n) => (n % 15 < 10 ? 0.95 : 0.15),
  },
  {
    id: "lapsed",
    description: "85% for 4 weeks, a 3-week lapse (5%), then back at 70%",
    adherence: (n) => (n < 28 ? 0.85 : n < 49 ? 0.05 : 0.7),
  },
];

/** One day of logs for a profile. Draw order is fixed so the curve is reproducible. */
export function dayLogs(profile: Profile, n: number, date: LocalDate, dow: Weekday, sleepOn: boolean, rng: Rng): HabitLog[] {
  const p = profile.adherence(n);
  const logs: HabitLog[] = [];
  const add = (habitId: string, kind: "full" | "tiny", tier?: Tier, source: HabitLog["source"] = "tap") =>
    logs.push({ habitId, date, kind, source, ...(tier ? { tier } : {}) });

  for (const habitId of ["ride", "lift", "pt"] as const) {
    if (!PLAN[habitId]?.includes(dow) || rng() >= p) continue;
    const big = habitId !== "pt" && rng() < (habitId === "ride" ? 0.4 : 0.5);
    add(habitId, "full", big ? "big" : "normal", habitId === "pt" ? "tap" : "apple_health");
  }

  // Eating well: 3+ checks is a normal log; on a weaker day, maybe one check (tiny).
  const eat = rng();
  if (eat < p) add("eat", "full");
  else if (eat < p + (1 - p) * 0.5) add("eat", "tiny");

  // Tidying: a room most days, a deep clean on some Saturdays, a 10-minute reset otherwise.
  const tidy = rng();
  if (tidy < p) add("tidy", "full", dow === 5 && rng() < 0.5 ? "big" : "normal");
  else if (tidy < p + (1 - p) * 0.4) add("tidy", "tiny");

  // Sleep: 7+ hours counts as normal, under 6 as tiny; it always syncs from the watch.
  if (sleepOn) add("sleep", rng() < p ? "full" : "tiny", undefined, "apple_health");

  return logs;
}
