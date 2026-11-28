import { DEFAULT_TUNING, healthLogs, sleepLogs, type SleepSpan } from "@inn/engine";
import type { HabitLog, HealthWorkout, LocalDate } from "@inn/schema";
import type { HabitInfo } from "@inn/schema/rows";

/**
 * Plain shapes of what HealthKit hands back, so this file has no native import and can be
 * unit-tested. Only the fields the design allows are read: no heart rate, no samples.
 */
export interface RawWorkout {
  uuid: string;
  /** HKWorkoutActivityType raw value. */
  workoutActivityType: number;
  startDate: Date;
  endDate: Date;
  duration: { quantity: number; unit: string };
  totalDistance?: { quantity: number; unit: string } | undefined;
  sourceRevision: { source: { bundleIdentifier: string; name: string } };
}

export interface RawSleep {
  startDate: Date;
  endDate: Date;
  /** HKCategoryValueSleepAnalysis: 0 in bed, 2 awake; 1, 3, 4, 5 are asleep stages. */
  value: number;
}

// HKWorkoutActivityType raw values.
const CYCLING = 13;
const STRENGTH = new Set([20, 50]); // functional, traditional strength training

const minutes = (q: { quantity: number; unit: string }) => (q.unit === "min" ? q.quantity : q.unit === "hr" ? q.quantity * 60 : q.quantity / 60);
const km = (q: { quantity: number; unit: string }) => (q.unit === "km" ? q.quantity : q.unit === "mi" ? q.quantity * 1.609344 : q.quantity / 1000);

/** A ride or a lift, or undefined for any other kind of workout. */
export function toWorkout(w: RawWorkout): HealthWorkout | undefined {
  const type = w.workoutActivityType === CYCLING ? "cycling" : STRENGTH.has(w.workoutActivityType) ? "strength" : undefined;
  if (!type) return undefined;
  const source = `${w.sourceRevision.source.bundleIdentifier} ${w.sourceRevision.source.name}`.toLowerCase();
  return {
    id: w.uuid,
    type,
    start: w.startDate.toISOString(),
    end: w.endDate.toISOString(),
    durationMin: Math.round(minutes(w.duration) * 10) / 10,
    ...(w.totalDistance && w.totalDistance.quantity > 0 ? { distanceKm: Math.round(km(w.totalDistance) * 100) / 100 } : {}),
    fromGarmin: source.includes("garmin"),
  };
}

export function toSleepSpans(samples: readonly RawSleep[]): SleepSpan[] {
  return samples.filter((s) => s.value !== 0 && s.value !== 2).map((s) => ({ start: s.startDate.toISOString(), end: s.endDate.toISOString() }));
}

export interface DesiredHealth {
  logs: HabitLog[];
  /** The workouts those logs came from, to keep (privately) in health_workouts. */
  workouts: HealthWorkout[];
}

/** What the open days' Apple Health logs should be, from what Apple Health holds now. */
export function desiredHealthLogs(
  raw: { workouts: readonly RawWorkout[]; sleep: readonly RawSleep[] },
  habits: readonly HabitInfo[],
  opts: { timeZone: string; lastClosed?: LocalDate; counted: ReadonlySet<string> },
): DesiredHealth {
  const habitFor = (t: "cycling" | "strength" | "sleep") => habits.find((h) => h.healthType === t && h.archivedOn === undefined)?.id;
  const workouts = raw.workouts.map(toWorkout).filter((w): w is HealthWorkout => w !== undefined);
  const ride = habitFor("cycling");
  const lift = habitFor("strength");
  const common = { timeZone: opts.timeZone, ...(opts.lastClosed ? { lastClosed: opts.lastClosed } : {}) };
  const logs = healthLogs(workouts, { ...common, counted: opts.counted, habitFor: { ...(ride ? { cycling: ride } : {}), ...(lift ? { strength: lift } : {}) } }, DEFAULT_TUNING);
  const sleepHabit = habitFor("sleep");
  const sleep = sleepHabit ? sleepLogs(toSleepSpans(raw.sleep), { ...common, habitId: sleepHabit }, DEFAULT_TUNING).filter((l) => !opts.counted.has(l.healthWorkoutId!)) : [];
  const used = new Set(logs.map((l) => l.healthWorkoutId));
  return { logs: [...logs, ...sleep], workouts: workouts.filter((w) => used.has(w.id)) };
}
