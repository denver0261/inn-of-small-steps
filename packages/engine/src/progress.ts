import type { Goal, HabitLog, LocalDate, Pause } from "@inn/schema";
import { addDays, dateRange, daysBetween, weekStart, weekday } from "./dates.ts";
import { activeGoal, effectiveWeeklyTarget, isPaused, isScheduledDay } from "./goals.ts";
import type { Tuning } from "./tuning.ts";

export type SessionsOn = (date: LocalDate, habitId: string) => number;

/** Sessions per habit per day, from a list of logs. */
export function sessionCounter(logs: readonly HabitLog[]): SessionsOn {
  const counts = new Map<string, number>();
  for (const l of logs) counts.set(`${l.date}|${l.habitId}`, (counts.get(`${l.date}|${l.habitId}`) ?? 0) + 1);
  return (date, habitId) => counts.get(`${date}|${habitId}`) ?? 0;
}

/**
 * Share of expected sessions done over the `windowDays` days ending on `date`, 0 to 1,
 * judged each day against the goal active that day. Paused days, unscheduled rest days
 * and days before the habit had a goal are left out. Undefined when nothing was expected.
 * This is the 14-day consistency rate shown instead of a streak.
 */
export function consistencyRate(
  habitId: string,
  date: LocalDate,
  goals: readonly Goal[],
  pauses: readonly Pause[],
  sessionsOn: SessionsOn,
  windowDays: number,
): number | undefined {
  let credit = 0;
  let expected = 0;
  for (const d of dateRange(addDays(date, -(windowDays - 1)), date)) {
    const goal = activeGoal(goals, habitId, d);
    if (goal === undefined || isPaused(pauses, habitId, d)) continue;
    const n = sessionsOn(d, habitId);
    if (goal.period === "day") {
      if (!isScheduledDay(goal, d)) continue;
      credit += Math.min(n, goal.target) / goal.target;
      expected += 1;
    } else {
      credit += n;
      expected += goal.target / 7;
    }
  }
  return expected === 0 ? undefined : Math.min(1, credit / expected);
}

export interface WeekProgress {
  done: number;
  /** This week's target after pauses. */
  target: number;
  /** Days left in the week after `date`. */
  daysLeft: number;
  met: boolean;
}

/** Mid-week pace for a weekly goal ("2 of 3 PT sessions, 2 days left"). Undefined for day goals. */
export function weekProgress(
  habitId: string,
  date: LocalDate,
  goals: readonly Goal[],
  pauses: readonly Pause[],
  sessionsOn: SessionsOn,
): WeekProgress | undefined {
  if (activeGoal(goals, habitId, date)?.period !== "week") return undefined;
  const start = weekStart(date);
  const end = addDays(start, 6);
  const done = dateRange(start, date).reduce((n, d) => n + sessionsOn(d, habitId), 0);
  const target = effectiveWeeklyTarget(goals, pauses, habitId, end);
  return { done, target, daysLeft: 6 - weekday(date), met: done >= target };
}

/**
 * Starts a new goal period on `date`. Earlier rows stay, so past weeks keep their target.
 * A second change on the same day replaces that day's row instead of stacking.
 */
export function changeGoal(goals: readonly Goal[], next: Goal): Goal[] {
  return [...goals.filter((g) => !(g.habitId === next.habitId && g.startDate === next.startDate)), next];
}

/** How many active habits a player may have on `date`, counted from the day they started. */
export function habitSlots(startedOn: LocalDate, date: LocalDate, tuning: Tuning): number {
  const { initial, afterDays, later } = tuning.habitSlots;
  return daysBetween(startedOn, date) >= afterDays ? later : initial;
}
