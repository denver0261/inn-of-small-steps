import type { Goal, Habit, HabitLog, LocalDate } from "@inn/schema";
import { closeDay, DEFAULT_TUNING, NEW_PLAYER_STATE, type LevelEvent, type NightInput, type PlayerState } from "../src/index.ts";

/** 2024-01-01 is a Monday; weeks in tests line up with it. */
export const MON: LocalDate = "2024-01-01";

export const ride: Habit = { id: "ride", name: "Ride", domain: "endurance", tier: "normal", tinyVersion: "10 min spin" };
export const tidy: Habit = { id: "tidy", name: "Tidy", domain: "home", tier: "normal", tinyVersion: "one surface" };
export const pt: Habit = { id: "pt", name: "PT", domain: "recovery", tier: "normal", tinyVersion: "one exercise" };

export const daily = (habitId: string, startDate: LocalDate = MON): Goal => ({
  habitId,
  period: "day",
  target: 1,
  startDate,
  prescribed: false,
});

export const weekly = (habitId: string, target: number, prescribed = false, startDate: LocalDate = MON): Goal => ({
  habitId,
  period: "week",
  target,
  startDate,
  prescribed,
});

export const log = (habitId: string, date: LocalDate, extra: Partial<HabitLog> = {}): HabitLog => ({
  habitId,
  date,
  kind: "full",
  source: "tap",
  ...extra,
});

export const baseInput = (date: LocalDate, logs: HabitLog[] = [], over: Partial<NightInput> = {}): NightInput => ({
  date,
  focusDomains: ["endurance"],
  habits: [ride, tidy, pt],
  goals: [daily("ride"), daily("tidy")],
  pauses: [],
  logs,
  ...over,
});

/** Closes `days` in order and returns the final state and every event. */
export function run(days: NightInput[], start: PlayerState = NEW_PLAYER_STATE): { state: PlayerState; events: LevelEvent[] } {
  let state = start;
  const events: LevelEvent[] = [];
  for (const input of days) {
    const r = closeDay(state, input, DEFAULT_TUNING);
    state = r.state;
    events.push(...r.events);
  }
  return { state, events };
}

export const xpEvents = (events: LevelEvent[]) => events.filter((e): e is Extract<LevelEvent, { type: "xp" }> => e.type === "xp");
