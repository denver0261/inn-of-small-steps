import { classPath, EVOLUTION_QUALIFIERS, SKILL_CATALOG } from "@inn/content";
import { addDays, closeDay, dateRange, DEFAULT_TUNING, gameDateAt, migrateState, NEW_PLAYER_STATE, type PlayerState, type Tuning } from "@inn/engine";
import { narrate, playerNight, type Narrate, type PlayerNight } from "@inn/narrator";
import type { LocalDate } from "@inn/schema";
import type { NightDb, PlayerRow, StoryRecord } from "./db.ts";

export interface RunOptions {
  db: NightDb;
  /** The current instant; the job never reads the clock itself. */
  now: Date;
  /** Claude, when a key is set. Without it every morning uses the templates. */
  call?: Narrate;
  promptVersion: string;
  tuning?: Tuning;
}

export interface RunReport {
  autoClosed: { playerId: string; dates: LocalDate[] }[];
  processed: { playerId: string; date: LocalDate; levels: number[] }[];
  stories: { householdId: string; date: LocalDate; source: "claude" | "template"; error?: string }[];
  /** Per-player failures; one player's bad night never blocks the other's. */
  errors: { playerId?: string; householdId?: string; message: string }[];
}

/**
 * One run of the nightly System. Safe to run as often as you like (every 15 minutes in
 * production): it closes days whose 4:00 has passed, runs the engine on closed days
 * that haven't been processed, and writes a household's morning once every housemate
 * has closed that day. Running it twice changes nothing.
 */
export async function runNight({ db, now, call, promptVersion, tuning = DEFAULT_TUNING }: RunOptions): Promise<RunReport> {
  const report: RunReport = { autoClosed: [], processed: [], stories: [], errors: [] };
  const players = await db.players();

  for (const p of players) {
    try {
      const today = gameDateAt(now, p.timeZone);
      const last = await db.lastClosed(p.id);
      const dates = dateRange(last ? addDays(last, 1) : p.startedOn, addDays(today, -1));
      if (dates.length > 0) {
        await db.autoClose(p.id, dates);
        report.autoClosed.push({ playerId: p.id, dates });
      }
      for (const date of await db.unprocessed(p.id)) {
        const levels = await processDay(db, p, date, tuning);
        report.processed.push({ playerId: p.id, date, levels });
      }
    } catch (e) {
      report.errors.push({ playerId: p.id, message: message(e) });
    }
  }

  const houses = new Map<string, PlayerRow[]>();
  for (const p of players) if (p.householdId) houses.set(p.householdId, [...(houses.get(p.householdId) ?? []), p]);
  for (const [householdId, members] of houses) {
    try {
      for (const date of await db.pendingStoryDates(householdId)) {
        const active = members.filter((m) => m.startedOn <= date);
        if (!(await allClosed(db, active, date))) break; // wait for the housemate; later dates wait too
        const story = await writeMorning(db, householdId, active, date, call, promptVersion);
        report.stories.push({ householdId, date, source: story.source, ...(story.error ? { error: story.error } : {}) });
      }
    } catch (e) {
      report.errors.push({ householdId, message: message(e) });
    }
  }
  return report;
}

async function processDay(db: NightDb, p: PlayerRow, date: LocalDate, tuning: Tuning): Promise<number[]> {
  const saved = await db.loadState(p.id);
  const state: PlayerState = saved === undefined ? NEW_PLAYER_STATE : migrateState(saved);
  if (state.lastClosed !== undefined && date <= state.lastClosed) {
    throw new Error(`${date} is closed but unprocessed while the saved state is already at ${state.lastClosed}`);
  }
  const path = p.classPathId ? classPath(p.classPathId) : undefined;
  const habits = (await db.habits(p.id)).filter((h) => h.archivedOn === undefined || h.archivedOn > date);
  const habitIds = new Set(habits.map((h) => h.id));
  const r = closeDay(
    state,
    {
      date,
      focusDomains: path?.focusDomains ?? [],
      habits,
      goals: await db.goals(p.id),
      pauses: await db.pauses(p.id),
      logs: (await db.logs(p.id, date)).filter((l) => habitIds.has(l.habitId)),
      playerId: p.id,
      ...(path ? { className: path.name } : {}),
      catalog: SKILL_CATALOG,
      qualifiers: EVOLUTION_QUALIFIERS,
      choices: await db.choices(p.id, date),
    },
    tuning,
  );
  await db.recordNight(p.id, date, r.state, r.events);
  return r.events.flatMap((e) => (e.type === "level_up" ? [e.level] : []));
}

async function allClosed(db: NightDb, members: readonly PlayerRow[], date: LocalDate): Promise<boolean> {
  for (const m of members) {
    const last = await db.lastClosed(m.id);
    if (last === undefined || last < date) return false;
    if ((await db.unprocessed(m.id)).some((d) => d <= date)) return false;
  }
  return true;
}

async function writeMorning(db: NightDb, householdId: string, members: readonly PlayerRow[], date: LocalDate, call: Narrate | undefined, promptVersion: string) {
  const nights: PlayerNight[] = [];
  for (const m of members) {
    const night = await db.night(m.id, date);
    if (!night) continue;
    const state = migrateState(night.stateAfter);
    const habits = await db.habits(m.id);
    const base = m.classPathId ? classPath(m.classPathId).name : "[Earther]";
    const className = state.evolution ? ((await db.evolutionName(m.id, state.evolution.id)) ?? state.evolution.fallbackName) : base;
    const done = (await db.logs(m.id, date)).map((l) => l.habitId);
    nights.push(playerNight({ playerId: m.id, name: m.name, className, habits, skillNames: await db.skillNames(m.id) }, state, night.events, done));
  }
  const narration = await narrate(
    { date, householdName: await db.householdName(householdId), players: nights, recentScenes: await db.recentScenes(householdId, date, 7) },
    call,
  );
  const record: StoryRecord = {
    householdId,
    date,
    scene: narration.output.morningScene,
    source: narration.source,
    promptVersion,
    players: narration.output.players.map((p) => ({ playerId: p.playerId, messages: p.levelMessages, skillNames: p.skillNames, evolutionNames: p.evolutionNames })),
    ...(narration.error ? { error: narration.error } : {}),
  };
  await db.recordStory(record);
  return narration;
}

function message(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}
