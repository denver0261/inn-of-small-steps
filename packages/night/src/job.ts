import { classPath, EVOLUTION_QUALIFIERS, ITEMS, RECIPES, RECRUITS, SKILL_CATALOG, TIER1_EVENTS, UPGRADES, VISITORS, upgrade as upgradeDef, item as itemDef, visitor as visitorDef } from "@inn/content";
import {
  addDays,
  closeDay,
  closeHouseNight,
  dateRange,
  dayEarnings,
  DEFAULT_TUNING,
  gameDateAt,
  migrateHouse,
  migrateState,
  NEW_HOUSE,
  NEW_PLAYER_STATE,
  outingSeed,
  planOuting,
  type DayActivity,
  type HouseEvent,
  type HousePlayerResult,
  type PlayerState,
  type Tuning,
} from "@inn/engine";
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

  // Close days whose 4:00 has passed.
  for (const p of players) {
    try {
      const today = gameDateAt(now, p.timeZone);
      const last = await db.lastClosed(p.id);
      const dates = dateRange(last ? addDays(last, 1) : p.startedOn, addDays(today, -1));
      if (dates.length > 0) {
        await db.autoClose(p.id, dates);
        report.autoClosed.push({ playerId: p.id, dates });
      }
    } catch (e) {
      report.errors.push({ playerId: p.id, message: message(e) });
    }
  }

  // A player with no house yet closes on their own.
  for (const p of players.filter((x) => !x.householdId)) {
    try {
      for (const date of await db.unprocessed(p.id)) report.processed.push({ playerId: p.id, date, levels: await processDay(db, p, date, tuning) });
    } catch (e) {
      report.errors.push({ playerId: p.id, message: message(e) });
    }
  }

  // A house settles each day once every housemate has closed it: the house's night
  // (income, outings, meals, building, crafting), then each player, then the morning.
  const houses = new Map<string, PlayerRow[]>();
  for (const p of players) if (p.householdId) houses.set(p.householdId, [...(houses.get(p.householdId) ?? []), p]);
  for (const [householdId, members] of houses) {
    try {
      const dates = [...new Set((await Promise.all(members.map((m) => db.unprocessed(m.id)))).flat())].sort();
      for (const date of dates) {
        const active = members.filter((m) => m.startedOn <= date);
        if (!(await allClosed(db, active, date))) break; // wait for the housemate; later days wait too
        const settled = await settleHouse(db, householdId, active, date, tuning);
        for (const m of active) {
          if (!(await db.unprocessed(m.id)).includes(date)) continue;
          report.processed.push({ playerId: m.id, date, levels: await processDay(db, m, date, tuning, settled[m.id]) });
        }
      }
      for (const date of await db.pendingStoryDates(householdId)) {
        const active = members.filter((m) => m.startedOn <= date);
        if (!(await allProcessed(db, active, date))) break;
        const story = await writeMorning(db, householdId, active, date, call, promptVersion);
        report.stories.push({ householdId, date, source: story.source, ...(story.error ? { error: story.error } : {}) });
      }
    } catch (e) {
      report.errors.push({ householdId, message: message(e) });
    }
  }
  return report;
}

/** Runs the house's night for a day, or returns what an earlier run already settled. */
async function settleHouse(db: NightDb, householdId: string, members: readonly PlayerRow[], date: LocalDate, tuning: Tuning): Promise<Record<string, HousePlayerResult>> {
  const done = await db.houseNight(householdId, date);
  if (done) return done.players;
  const saved = await db.houseState(householdId);
  const house = saved === undefined ? NEW_HOUSE : migrateHouse(saved);
  const orders = await db.orders(householdId, date);
  const states = new Map<string, PlayerState>();
  for (const m of members) {
    const raw = await db.loadState(m.id);
    states.set(m.id, raw === undefined ? NEW_PLAYER_STATE : migrateState(raw));
  }
  const players = await Promise.all(
    members.map(async (m) => {
      const state = states.get(m.id)!;
      const outings = (await db.outings(m.id, date)).sort((a, b) => a.index - b.index).map((o) => {
        const seed = outingSeed(m.id, date, o.index);
        return { seed, eventIds: planOuting(seed, TIER1_EVENTS, tuning), choices: o.choices };
      });
      return {
        playerId: m.id,
        earned: dayEarnings(await db.logs(m.id, date), await db.habits(m.id), tuning).resources,
        stamina: state.stamina,
        context: { level: state.progress.level, skills: state.skills, pity: state.pity },
        outings,
        meals: orders.filter((o) => o.kind === "meal" && o.playerId === m.id).map((o) => o.ref),
      };
    }),
  );
  const r = closeHouseNight(
    house,
    {
      date,
      householdId,
      players,
      builds: orders.filter((o) => o.kind === "build").map((o) => o.ref),
      crafts: orders.filter((o) => o.kind === "craft").map((o) => o.ref),
      skillThemes: [...new Set([...states.values()].flatMap((s) => s.skills.map((k) => k.theme)))],
      visitorOrders: orders.flatMap((o) => (o.kind === "accept" || o.kind === "decline" || o.kind === "serve" || o.kind === "inn" ? [{ playerId: o.playerId, kind: o.kind, ref: o.ref }] : [])),
      activity: await questActivity(db, members, house.quests.map((q) => q.startDate), date),
      content: { upgrades: UPGRADES, recipes: RECIPES, items: ITEMS, events: TIER1_EVENTS, visitors: VISITORS, recruits: RECRUITS },
    },
    tuning,
  );
  await db.recordHouseNight(householdId, date, r.house, r.events, r.players);
  return r.players;
}

/** Everyone's logs by domain (and chores) from the earliest active quest's start through `date`. */
async function questActivity(db: NightDb, members: readonly PlayerRow[], starts: readonly LocalDate[], date: LocalDate): Promise<DayActivity[]> {
  if (starts.length === 0) return [];
  const from = [...starts].sort()[0]!;
  if (from > date) return [];
  const out: DayActivity[] = [];
  for (const m of members) {
    const habits = await db.habits(m.id);
    const byDate = new Map<LocalDate, DayActivity>();
    for (const log of await db.logsBetween(m.id, from, date)) {
      const a = byDate.get(log.date) ?? { date: log.date, playerId: m.id, domains: {}, chores: 0 };
      const domain = habits.find((h) => h.id === log.habitId)?.domain;
      if (domain) a.domains[domain] = (a.domains[domain] ?? 0) + 1;
      if (log.choreId) a.chores += 1;
      byDate.set(log.date, a);
    }
    out.push(...byDate.values());
  }
  return out;
}

async function processDay(db: NightDb, p: PlayerRow, date: LocalDate, tuning: Tuning, house?: HousePlayerResult): Promise<number[]> {
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
      ...(house ? { house } : {}),
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
  }
  return true;
}

async function allProcessed(db: NightDb, members: readonly PlayerRow[], date: LocalDate): Promise<boolean> {
  if (!(await allClosed(db, members, date))) return false;
  for (const m of members) if ((await db.unprocessed(m.id)).some((d) => d <= date)) return false;
  return true;
}

/** "a mounted rock crab claw"; names that already start with an article keep it. */
function withArticle(name: string): string {
  const lower = name.charAt(0).toLowerCase() + name.slice(1);
  return /^(a|an|the) /i.test(name) ? lower : `${/^[aeiou]/i.test(name) ? "an" : "a"} ${lower}`;
}

/** Plain sentences about the house's night, for the morning. */
export function houseNews(events: readonly HouseEvent[], names: Readonly<Record<string, string>>): string[] {
  const out: string[] = [];
  for (const e of events) {
    if (e.type === "built") out.push(`${upgradeDef(e.upgradeId).name} is finished overnight.`);
    if (e.type === "crafted") out.push(`${itemDef(e.itemId).name} is ready${e.fine ? ", and it came out especially well" : ""}.`);
    if (e.type === "visitor_arrived") out.push(`${visitorDef(e.offer.templateId).name} will be at the door this morning.`);
    if (e.type === "quest_done") out.push(`${visitorDef(e.quest.templateId).thanks}`);
    if (e.type === "inn_evening") out.push(`${names[e.playerId] ?? "Someone"} spent the evening at the Wandering Inn.`);
    if (e.type === "outing" && e.result.rare) out.push(`${names[e.playerId] ?? "Someone"} came home from an outing with ${withArticle(itemDef(e.result.rare).name)}.`);
  }
  return out;
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
  const houseEvents = (await db.houseNight(householdId, date))?.events ?? [];
  const news = houseNews(houseEvents, Object.fromEntries(members.map((m) => [m.id, m.name])));
  const narration = await narrate(
    { date, householdName: await db.householdName(householdId), players: nights, recentScenes: await db.recentScenes(householdId, date, 7), houseNews: news },
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
