import type { Goal, LocalDate, Pause } from "@inn/schema";
import { dateRange, weekStart, weekday } from "./dates.ts";

/** The goal row in force for `habitId` on `date`: the latest one started by then and not yet ended. */
export function activeGoal(goals: readonly Goal[], habitId: string, date: LocalDate): Goal | undefined {
  let best: Goal | undefined;
  for (const g of goals) {
    if (g.habitId !== habitId || g.startDate > date) continue;
    if (best === undefined || g.startDate >= best.startDate) best = g;
  }
  if (best?.endDate !== undefined && best.endDate < date) return undefined;
  return best;
}

export function isPaused(pauses: readonly Pause[], habitId: string, date: LocalDate): boolean {
  return pauses.some(
    (p) => p.startDate <= date && date <= p.endDate && (p.habitIds === undefined || p.habitIds.includes(habitId)),
  );
}

/** Whether a day goal expects a session on `date`. Week goals have no fixed days. */
export function isScheduledDay(goal: Goal, date: LocalDate): boolean {
  return goal.period === "day" && (goal.days === undefined || goal.days.includes(weekday(date)));
}

/**
 * A weekly target shrinks with the days that were paused or outside the goal:
 * 3 a week with 3 of 7 days paused becomes round(3 * 4/7) = 2.
 */
export function effectiveWeeklyTarget(
  goals: readonly Goal[],
  pauses: readonly Pause[],
  habitId: string,
  weekEnd: LocalDate,
): number {
  const goal = activeGoal(goals, habitId, weekEnd);
  if (goal?.period !== "week") return 0;
  const days = dateRange(weekStart(weekEnd), weekEnd);
  const live = days.filter((d) => activeGoal(goals, habitId, d) !== undefined && !isPaused(pauses, habitId, d)).length;
  return Math.round((goal.target * live) / 7);
}
