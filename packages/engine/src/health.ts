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

/** One stretch of sleep from Apple Health (any "asleep" stage; in-bed and awake are left out). */
export interface SleepSpan {
  start: string;
  end: string;
}

export interface SleepImportOptions {
  habitId: string;
  timeZone: string;
  lastClosed?: LocalDate;
}

/**
 * Turns asleep spans into one Sleep log per night. Overlapping spans (a watch and the phone
 * both recording) are merged, so time asleep is never counted twice. A night belongs to the
 * game day its sleep ends on: last night's sleep counts toward the coming night's close.
 * Sleep for a day already closed counts toward the next open day, labeled with its real date.
 * 7+ hours is normal, less is tiny (decision 0017). Only the duration is used.
 */
export function sleepLogs(spans: readonly SleepSpan[], opts: SleepImportOptions, tuning: Tuning): HabitLog[] {
  const sorted = spans
    .map((s) => ({ start: Date.parse(s.start), end: Date.parse(s.end) }))
    .filter((s) => s.end > s.start)
    .sort((a, b) => a.start - b.start);
  const merged: { start: number; end: number }[] = [];
  for (const s of sorted) {
    const last = merged.at(-1);
    if (last && s.start <= last.end) last.end = Math.max(last.end, s.end);
    else merged.push({ ...s });
  }
  const minutesByDay = new Map<LocalDate, number>();
  for (const s of merged) {
    const day = gameDateAt(new Date(s.end), opts.timeZone);
    minutesByDay.set(day, (minutesByDay.get(day) ?? 0) + (s.end - s.start) / 60_000);
  }
  const openDay = opts.lastClosed === undefined ? undefined : addDays(opts.lastClosed, 1);
  return [...minutesByDay]
    .filter(([, minutes]) => minutes >= tuning.sleep.minMinutes)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, minutes]) => {
      const late = openDay !== undefined && day < openDay;
      const log: HabitLog = {
        habitId: opts.habitId,
        date: late ? openDay : day,
        kind: minutes >= tuning.sleep.normalFromMinutes ? "full" : "tiny",
        source: "apple_health",
        healthWorkoutId: `sleep:${day}`,
      };
      if (late) log.performedOn = day;
      return log;
    });
}

export interface HealthSyncPlan {
  insert: HabitLog[];
  /** Ids of existing open-day Apple Health logs to remove (their record left Apple Health). */
  remove: string[];
}

/**
 * What to change so the open days' Apple Health logs match what Apple Health holds now.
 * Logs are matched by their Apple Health id; anything else is left alone.
 */
export function planHealthSync(existing: readonly (HabitLog & { id: string })[], desired: readonly HabitLog[]): HealthSyncPlan {
  const want = new Map(desired.map((l) => [l.healthWorkoutId, l]));
  const have = new Map(existing.filter((l) => l.source === "apple_health").map((l) => [l.healthWorkoutId, l]));
  const same = (a: HabitLog, b: HabitLog) => a.habitId === b.habitId && a.date === b.date && a.kind === b.kind && a.tier === b.tier;
  const remove: string[] = [];
  for (const [hid, log] of have) {
    const w = hid === undefined ? undefined : want.get(hid);
    if (!w || !same(w, log)) remove.push(log.id);
  }
  const insert = desired.filter((l) => {
    const h = have.get(l.healthWorkoutId);
    return !h || !same(h, l);
  });
  return { insert, remove };
}
