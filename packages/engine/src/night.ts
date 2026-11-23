import type { Domain, Goal, Habit, HabitLog, LocalDate, Pause } from "@inn/schema";
import { addDays, dateRange, daysBetween, weekStart, weekday } from "./dates.ts";
import { activeGoal, effectiveWeeklyTarget, isPaused, isScheduledDay } from "./goals.ts";
import { addXp, NEW_PLAYER, type Progress } from "./levels.ts";
import { consistencyRate, type SessionsOn } from "./progress.ts";
import type { Tuning } from "./tuning.ts";

/** Sessions per habit on one closed day. The engine's only memory of past logs. */
export interface DayRecord {
  date: LocalDate;
  sessions: Readonly<Record<string, number>>;
}

export interface PlayerState {
  progress: Progress;
  /** Missed scheduled sessions per habit since its last log; feeds the rusty bonus. */
  misses: Readonly<Record<string, number>>;
  /** Closed days, oldest first, trimmed to what the rules can still look back on. */
  history: readonly DayRecord[];
  lastClosed?: LocalDate;
  /** The last day with any log, for the comeback bonus. */
  lastActive?: LocalDate;
}

export const NEW_PLAYER_STATE: PlayerState = { progress: NEW_PLAYER, misses: {}, history: [] };

/** Everything the night needs besides state. `goals` and `pauses` are full histories. */
export interface NightInput {
  date: LocalDate;
  focusDomains: readonly Domain[];
  habits: readonly Habit[];
  goals: readonly Goal[];
  pauses: readonly Pause[];
  /** Logs for `date`. Logs for other dates are ignored. */
  logs: readonly HabitLog[];
}

export interface XpFactors {
  path: number;
  consistency: number;
  rusty: number;
  prescribed: number;
}

export type LevelEvent =
  | { type: "xp"; date: LocalDate; habitId: string; base: number; factors: XpFactors; amount: number }
  | { type: "comeback"; date: LocalDate; daysAway: number; amount: number }
  | { type: "level_up"; date: LocalDate; level: number }
  | { type: "skill_slot"; date: LocalDate; level: number };

export interface NightResult {
  state: PlayerState;
  events: LevelEvent[];
}

/**
 * The nightly close. Pure and idempotent: closing a day that is already closed returns
 * the state unchanged with no events, and days skipped since the last close are closed
 * first as empty days, so a missed auto-close can never lose a miss or a level.
 */
export function closeDay(state: PlayerState, input: NightInput, tuning: Tuning): NightResult {
  if (state.lastClosed !== undefined && input.date <= state.lastClosed) return { state, events: [] };
  const events: LevelEvent[] = [];
  let current = state;
  if (state.lastClosed !== undefined) {
    for (const gap of dateRange(addDays(state.lastClosed, 1), addDays(input.date, -1))) {
      const r = closeOne(current, { ...input, date: gap, logs: [] }, tuning);
      current = r.state;
      events.push(...r.events);
    }
  }
  const r = closeOne(current, input, tuning);
  events.push(...r.events);
  return { state: r.state, events };
}

function closeOne(state: PlayerState, input: NightInput, tuning: Tuning): NightResult {
  const { date } = input;
  const logs = input.logs.filter((l) => l.date === date);
  const habitById = new Map(input.habits.map((h) => [h.id, h]));

  const sessions: Record<string, number> = {};
  for (const log of logs) {
    if (!habitById.has(log.habitId)) throw new Error(`log for unknown habit: ${log.habitId}`);
    sessions[log.habitId] = (sessions[log.habitId] ?? 0) + 1;
  }
  const today: DayRecord = { date, sessions };
  const lookback = [...state.history, today];
  const sessionsOn = (d: LocalDate, habitId: string): number =>
    lookback.find((r) => r.date === d)?.sessions[habitId] ?? 0;

  const events: LevelEvent[] = [];
  const misses: Record<string, number> = { ...state.misses };
  const seenToday: Record<string, number> = {};
  let nightXp = 0;

  for (const log of logs) {
    const habit = habitById.get(log.habitId)!;
    const goal = activeGoal(input.goals, habit.id, date);
    const tier = log.kind === "tiny" ? "tiny" : (log.tier ?? habit.tier);
    const base = tuning.tierXp[tier];

    const priorToday = seenToday[habit.id] ?? 0;
    seenToday[habit.id] = priorToday + 1;

    let rusty = 0;
    if (priorToday === 0 && (misses[habit.id] ?? 0) > 0) {
      rusty = Math.min(tuning.rusty.cap, tuning.rusty.perMiss * (misses[habit.id] ?? 0));
      misses[habit.id] = 0;
    }

    const factors: XpFactors = {
      path: input.focusDomains.includes(habit.domain) ? 1 : tuning.offPathFactor,
      consistency: consistencyMultiplier(habit.id, date, input, sessionsOn, tuning),
      rusty,
      prescribed: isOverPrescribed(goal, habit.id, date, priorToday, sessionsOn) ? tuning.prescribedOverTargetFactor : 1,
    };
    const amount = Math.round(base * factors.path * factors.consistency * (1 + factors.rusty) * factors.prescribed);
    nightXp += amount;
    events.push({ type: "xp", date, habitId: habit.id, base, factors, amount });
  }

  if (logs.length > 0 && state.lastActive !== undefined) {
    const daysAway = daysBetween(state.lastActive, date) - 1;
    if (daysAway >= tuning.comeback.awayDays) {
      const amount = Math.round(nightXp * tuning.comeback.bonus);
      nightXp += amount;
      events.push({ type: "comeback", date, daysAway, amount });
    }
  }

  // Misses are judged after today's logs, so a habit done today is never missed today.
  const maxMisses = Math.round(tuning.rusty.cap / tuning.rusty.perMiss);
  for (const habit of input.habits) {
    const goal = activeGoal(input.goals, habit.id, date);
    if (goal === undefined || isPaused(input.pauses, habit.id, date)) continue;
    let missed = 0;
    if (goal.period === "day" && isScheduledDay(goal, date) && (sessions[habit.id] ?? 0) === 0) missed = 1;
    if (goal.period === "week" && weekday(date) === 6) {
      const done = dateRange(weekStart(date), date).reduce((n, d) => n + sessionsOn(d, habit.id), 0);
      missed = Math.max(0, effectiveWeeklyTarget(input.goals, input.pauses, habit.id, date) - done);
    }
    if (missed > 0) misses[habit.id] = Math.min(maxMisses, (misses[habit.id] ?? 0) + missed);
  }

  const { progress, levelsReached } = addXp(state.progress, nightXp, tuning);
  for (const level of levelsReached) {
    events.push({ type: "level_up", date, level });
    if (tuning.skillSlotLevels.includes(level)) events.push({ type: "skill_slot", date, level });
  }

  // Keep the consistency window plus one week for weekly targets.
  const keep = tuning.consistency.windowDays + 7;
  const next: PlayerState = {
    progress,
    misses,
    history: lookback.slice(-keep),
    lastClosed: date,
  };
  const lastActive = logs.length > 0 ? date : state.lastActive;
  if (lastActive !== undefined) next.lastActive = lastActive;
  return { state: next, events };
}

/** 1.0 to 1.5 from the habit's 14-day consistency rate (see `consistencyRate`); no history counts as 0. */
export function consistencyMultiplier(
  habitId: string,
  date: LocalDate,
  input: Pick<NightInput, "goals" | "pauses">,
  sessionsOn: SessionsOn,
  tuning: Tuning,
): number {
  const { windowDays, min, max } = tuning.consistency;
  const rate = consistencyRate(habitId, date, input.goals, input.pauses, sessionsOn, windowDays) ?? 0;
  return min + (max - min) * rate;
}

function isOverPrescribed(
  goal: Goal | undefined,
  habitId: string,
  date: LocalDate,
  priorToday: number,
  sessionsOn: SessionsOn,
): boolean {
  if (goal?.prescribed !== true) return false;
  if (goal.period === "day") return priorToday >= goal.target;
  const earlierThisWeek = dateRange(weekStart(date), addDays(date, -1)).reduce((n, d) => n + sessionsOn(d, habitId), 0);
  return earlierThisWeek + priorToday >= goal.target;
}
