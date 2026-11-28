import type { HouseEvent, HousePlayerResult, LevelEvent, NightChoices } from "@inn/engine";
import type { Goal, Habit, HabitLog, LocalDate, Pause } from "@inn/schema";

export interface PlayerRow {
  id: string;
  householdId: string | null;
  name: string;
  timeZone: string;
  classPathId: string | null;
  startedOn: LocalDate;
}

export interface HabitRow extends Habit {
  archivedOn?: LocalDate;
}

/** Everything the nightly job reads and writes. The real one is Supabase; tests use memory. */
export interface NightDb {
  players(): Promise<PlayerRow[]>;
  householdName(id: string): Promise<string>;
  /** The latest closed date for a player, if any. */
  lastClosed(playerId: string): Promise<LocalDate | undefined>;
  /** Closes days at 4:00 (`source = 'auto'`); days already closed are left alone. */
  autoClose(playerId: string, dates: readonly LocalDate[]): Promise<void>;
  /** Closed days the engine hasn't run for yet, oldest first. */
  unprocessed(playerId: string): Promise<LocalDate[]>;
  loadState(playerId: string): Promise<unknown | undefined>;
  habits(playerId: string): Promise<HabitRow[]>;
  goals(playerId: string): Promise<Goal[]>;
  pauses(playerId: string): Promise<Pause[]>;
  logs(playerId: string, date: LocalDate): Promise<HabitLog[]>;
  choices(playerId: string, date: LocalDate): Promise<NightChoices>;
  /** Atomically saves state and events and marks the day processed. */
  recordNight(playerId: string, date: LocalDate, state: unknown, events: readonly LevelEvent[]): Promise<void>;
  /** The events and state saved for a processed day. */
  night(playerId: string, date: LocalDate): Promise<{ events: LevelEvent[]; stateAfter: unknown } | undefined>;
  /** Processed days of anyone in the house that have no morning yet, oldest first. */
  pendingStoryDates(householdId: string): Promise<LocalDate[]>;
  recentScenes(householdId: string, before: LocalDate, count: number): Promise<string[]>;
  /** Names given to a player's Skills, by `${defId}:${tier}`. */
  skillNames(playerId: string): Promise<Record<string, string>>;
  evolutionName(playerId: string, optionId: string): Promise<string | undefined>;
  recordStory(story: StoryRecord): Promise<void>;
  /** The saved house state, if the house has had a night yet. */
  houseState(householdId: string): Promise<unknown | undefined>;
  /** A settled house night: its events and what it settled per player. */
  houseNight(householdId: string, date: LocalDate): Promise<{ events: HouseEvent[]; players: Record<string, HousePlayerResult> } | undefined>;
  /** Atomically saves the house state and the night's events. */
  recordHouseNight(householdId: string, date: LocalDate, state: unknown, events: readonly HouseEvent[], players: Record<string, HousePlayerResult>): Promise<void>;
  /** A player's outings on a day: index and choices only (the seed is derived). */
  outings(playerId: string, date: LocalDate): Promise<{ index: number; choices: number[] }[]>;
  /** The house's orders for a day, oldest first. */
  orders(householdId: string, date: LocalDate): Promise<{ playerId: string; kind: "build" | "craft" | "meal"; ref: string }[]>;
}

export interface StoryRecord {
  householdId: string;
  date: LocalDate;
  scene: string;
  source: "claude" | "template";
  error?: string;
  promptVersion: string;
  players: {
    playerId: string;
    messages: string[];
    skillNames: { defId: string; tier: number; name: string; text: string }[];
    evolutionNames: { optionId: string; name: string; text: string }[];
  }[];
}
