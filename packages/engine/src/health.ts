import type { HabitLog, HealthWorkout, LocalDate } from "@inn/schema";
import { gameDateAt } from "./clock.ts";
import { addDays } from "./dates.ts";
import type { Tuning } from "./tuning.ts";

export interface HealthImportOptions {
  /** Which habit each workout type logs to. A type with no habit is ignored. */
  habitFor: Partial<Record<HealthWorkout["type"], string>>;
  timeZone: string;
  /** The player's last closed day. Workouts from on or before it count toward the next open day. */
  lastClosed?: LocalDate;
  /** Workout ids already counted in a closed day. They win any duplicate check and are not logged again. */
  counted?: ReadonlySet<string>;
}

/**
 * Turns the Apple Health workouts currently on the phone into HabitLogs for the open day(s).
 * Call it with the full current set each sync and replace the previous apple_health logs
 * for open days: a workout deleted in Apple Health before the day closes then drops out.
 *
 * Workouts of one type that overlap in time are one session. Already-counted records win,
 * then Garmin's, then the earliest start.
 */
export function healthLogs(workouts: readonly HealthWorkout[], opts: HealthImportOptions, tuning: Tuning): HabitLog[] {
  const counted = opts.counted ?? new Set<string>();
  const order = (w: HealthWorkout) => (counted.has(w.id) ? 0 : w.fromGarmin ? 1 : 2);
  const sorted = [...workouts].sort((a, b) => order(a) - order(b) || a.start.localeCompare(b.start) || a.id.localeCompare(b.id));

  const kept: HealthWorkout[] = [];
  for (const w of sorted) {
    if (opts.habitFor[w.type] === undefined) continue;
    if (kept.some((k) => k.type === w.type && overlaps(k, w))) continue;
    kept.push(w);
  }

  const openDay = opts.lastClosed === undefined ? undefined : addDays(opts.lastClosed, 1);
  return kept
    .filter((w) => !counted.has(w.id))
    .sort((a, b) => a.start.localeCompare(b.start))
    .map((w) => {
      const performedOn = gameDateAt(new Date(w.start), opts.timeZone);
      const late = openDay !== undefined && performedOn < openDay;
      const log: HabitLog = {
        habitId: opts.habitFor[w.type]!,
        date: late ? openDay : performedOn,
        kind: "full",
        tier: w.durationMin >= tuning.workoutBigFromMin[w.type] ? "big" : "normal",
        source: "apple_health",
        healthWorkoutId: w.id,
      };
      if (late) log.performedOn = performedOn;
      return log;
    });
}

function overlaps(a: HealthWorkout, b: HealthWorkout): boolean {
  return Date.parse(a.start) < Date.parse(b.end) && Date.parse(b.start) < Date.parse(a.end);
}
