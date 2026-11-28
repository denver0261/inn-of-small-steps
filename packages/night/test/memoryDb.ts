import type { LevelEvent, NightChoices } from "@inn/engine";
import type { Goal, HabitLog, LocalDate, Pause } from "@inn/schema";
import type { HabitRow, NightDb, PlayerRow, StoryRecord } from "../src/db.ts";

/** An in-memory NightDb that mirrors the database's rules (one close per day, one morning per house and day). */
export class MemoryDb implements NightDb {
  players_: PlayerRow[] = [];
  houses = new Map<string, string>();
  habits_ = new Map<string, HabitRow[]>();
  goals_ = new Map<string, Goal[]>();
  logs_: (HabitLog & { playerId: string })[] = [];
  choices_ = new Map<string, NightChoices>();
  closes = new Map<string, { source: "sleep" | "auto"; processed: boolean }>();
  states = new Map<string, unknown>();
  nights = new Map<string, { events: LevelEvent[]; stateAfter: unknown }>();
  stories = new Map<string, StoryRecord>();
  names = new Map<string, string>();

  sleep(playerId: string, date: LocalDate) {
    if (!this.closes.has(`${playerId}|${date}`)) this.closes.set(`${playerId}|${date}`, { source: "sleep", processed: false });
  }

  async players() {
    return this.players_;
  }
  async householdName(id: string) {
    return this.houses.get(id) ?? "?";
  }
  async lastClosed(playerId: string) {
    return [...this.closes.keys()].filter((k) => k.startsWith(`${playerId}|`)).map((k) => k.split("|")[1]!).sort().at(-1);
  }
  async autoClose(playerId: string, dates: readonly LocalDate[]) {
    for (const d of dates) if (!this.closes.has(`${playerId}|${d}`)) this.closes.set(`${playerId}|${d}`, { source: "auto", processed: false });
  }
  async unprocessed(playerId: string) {
    return [...this.closes].filter(([k, v]) => k.startsWith(`${playerId}|`) && !v.processed).map(([k]) => k.split("|")[1]!).sort();
  }
  async loadState(playerId: string) {
    return this.states.get(playerId);
  }
  async habits(playerId: string) {
    return this.habits_.get(playerId) ?? [];
  }
  async goals(playerId: string) {
    return this.goals_.get(playerId) ?? [];
  }
  async pauses(): Promise<Pause[]> {
    return [];
  }
  async logs(playerId: string, date: LocalDate) {
    return this.logs_.filter((l) => l.playerId === playerId && l.date === date).map(({ playerId: _, ...l }) => l);
  }
  async choices(playerId: string, date: LocalDate) {
    return this.choices_.get(`${playerId}|${date}`) ?? {};
  }
  async recordNight(playerId: string, date: LocalDate, state: unknown, events: readonly LevelEvent[]) {
    const json = JSON.parse(JSON.stringify({ state, events }));
    this.states.set(playerId, json.state);
    this.nights.set(`${playerId}|${date}`, { events: json.events, stateAfter: json.state });
    this.closes.get(`${playerId}|${date}`)!.processed = true;
  }
  async night(playerId: string, date: LocalDate) {
    return this.nights.get(`${playerId}|${date}`);
  }
  async pendingStoryDates(householdId: string) {
    const members = this.players_.filter((p) => p.householdId === householdId).map((p) => p.id);
    const dates = [...this.nights.keys()].filter((k) => members.includes(k.split("|")[0]!)).map((k) => k.split("|")[1]!);
    return [...new Set(dates)].filter((d) => !this.stories.has(`${householdId}|${d}`)).sort();
  }
  async recentScenes(householdId: string, before: LocalDate, count: number) {
    return [...this.stories.values()].filter((s) => s.householdId === householdId && s.date < before).sort((a, b) => a.date.localeCompare(b.date)).slice(-count).map((s) => s.scene);
  }
  async skillNames(playerId: string) {
    return Object.fromEntries([...this.names].filter(([k]) => k.startsWith(`${playerId}|`)).map(([k, v]) => [k.split("|")[1]!, v]));
  }
  async evolutionName() {
    return undefined;
  }
  async recordStory(s: StoryRecord) {
    const key = `${s.householdId}|${s.date}`;
    if (this.stories.has(key)) return;
    this.stories.set(key, s);
    for (const p of s.players) for (const n of p.skillNames) this.names.set(`${p.playerId}|${n.defId}:${n.tier}`, n.name);
  }
}
