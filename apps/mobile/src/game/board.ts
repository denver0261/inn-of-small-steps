import {
  activeGoal,
  addDays,
  consistencyRate,
  habitSlots,
  isPaused,
  isScheduledDay,
  sessionCounter,
  weekProgress,
  weekStart,
  type Tuning,
  type WeekProgress,
} from "@inn/engine";
import type { Goal, LocalDate, Pause } from "@inn/schema";
import type { HabitInfo, LogInfo } from "../data/rows.ts";

export interface HabitCard {
  habit: HabitInfo;
  goal?: Goal;
  todaysLogs: LogInfo[];
  /** 14-day consistency, 0 to 1; undefined while nothing has been expected yet. */
  rate?: number;
  /** Weekly goals only. */
  week?: WeekProgress;
  /** Day goals: whether today is a scheduled day (rest days count as done). */
  scheduledToday: boolean;
  /** Day goals: today's sessions reach the target, so there is nothing left to tap. */
  doneForToday: boolean;
  paused: boolean;
}

/** The first day the Today screen needs logs from: the consistency window or the week start. */
export function logWindowStart(today: LocalDate, tuning: Tuning): LocalDate {
  const windowStart = addDays(today, -(tuning.consistency.windowDays - 1));
  const week = weekStart(today);
  return week < windowStart ? week : windowStart;
}

/** One card per habit, for one player's own habits and logs. */
export function buildBoard(
  today: LocalDate,
  habits: readonly HabitInfo[],
  goals: readonly Goal[],
  pauses: readonly Pause[],
  logs: readonly LogInfo[],
  tuning: Tuning,
): HabitCard[] {
  const sessionsOn = sessionCounter(logs);
  return habits.map((habit) => {
    const goal = activeGoal(goals, habit.id, today);
    const rate = consistencyRate(habit.id, today, goals, pauses, sessionsOn, tuning.consistency.windowDays);
    const week = weekProgress(habit.id, today, goals, pauses, sessionsOn);
    const card: HabitCard = {
      habit,
      todaysLogs: logs.filter((l) => l.habitId === habit.id && l.date === today),
      scheduledToday: goal === undefined ? false : goal.period === "week" || isScheduledDay(goal, today),
      doneForToday: goal?.period === "day" && sessionsOn(today, habit.id) >= goal.target,
      paused: isPaused(pauses, habit.id, today),
    };
    if (goal) card.goal = goal;
    if (rate !== undefined) card.rate = rate;
    if (week) card.week = week;
    return card;
  });
}

/** "3x a week", "every day", "Mon, Wed, Fri". */
export function describeGoal(goal: Goal | undefined): string {
  if (goal === undefined) return "no goal";
  const prescribed = goal.prescribed ? " (prescribed)" : "";
  if (goal.period === "week") return `${goal.target}x a week${prescribed}`;
  const days = goal.days === undefined ? "every day" : goal.days.map((d) => WEEKDAYS[d]).join(", ");
  const times = goal.target > 1 ? `${goal.target}x ` : "";
  return `${times}${days}${prescribed}`;
}

export const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

/** Whether the player may add another habit today. */
export function canAddHabit(activeCount: number, startedOn: LocalDate, today: LocalDate, tuning: Tuning): boolean {
  return activeCount < habitSlots(startedOn, today, tuning);
}

export function percent(rate: number | undefined): string {
  return rate === undefined ? "–" : `${Math.round(rate * 100)}%`;
}
