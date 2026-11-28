import { ITEMS, RECIPES, RECRUITS, SKILL_CATALOG, TIER1_EVENTS, UPGRADES, VISITORS } from "@inn/content";
import {
  addDays,
  closeDay,
  closeHouseNight,
  dayEarnings,
  DEFAULT_TUNING,
  NEW_HOUSE,
  NEW_PLAYER_STATE,
  nextUpgrade,
  outingSeed,
  planOuting,
  weekday,
  type DayActivity,
  type OutingRecord,
  type PlayerState,
  type Tuning,
} from "@inn/engine";
import { dayLogs, FOCUS, goals, HABITS, mulberry32, PROFILES } from "./profiles.ts";
import { START } from "./simulate.ts";

export interface HouseResult {
  visitors: number;
  questsDone: number;
  questsExpired: number;
  recruits: string[];
  /** Day number (1-based) each upgrade was built. */
  builtOnDay: Record<string, number>;
  outings: number;
  /** Coins the outings brought home, as a share of all coins earned. */
  outingCoinShare: number;
}

/**
 * Two steady players share a house for 120 days. Each night they order the next upgrade
 * and each goes on one outing when they have the stamina, taking the first choice every
 * time. Shows how fast the ladder climbs at the current prices.
 */
export function simulateHouse(tuning: Tuning = DEFAULT_TUNING, days = 120): HouseResult {
  const steady = PROFILES.find((p) => p.id === "steady")!;
  const rngs = [mulberry32(11), mulberry32(22)];
  const allGoals = goals(START, addDays(START, 14));
  let house = NEW_HOUSE;
  let players: PlayerState[] = [NEW_PLAYER_STATE, NEW_PLAYER_STATE];
  const builtOnDay: Record<string, number> = {};
  let outings = 0;
  let outingCoins = 0;
  let allCoins = 0;
  let visitors = 0;
  let questsDone = 0;
  let questsExpired = 0;
  const activity: DayActivity[] = [];

  for (let n = 0; n < days; n++) {
    const date = addDays(START, n);
    const logs = players.map((_, i) => dayLogs(steady, n, date, weekday(date), n >= 14, rngs[i]!));
    const next = nextUpgrade(house, UPGRADES);
    logs.forEach((dayLogsOf, i) => {
      const domains: DayActivity["domains"] = {};
      for (const l of dayLogsOf) {
        const d = HABITS.find((h) => h.id === l.habitId)!.domain;
        domains[d] = (domains[d] ?? 0) + 1;
      }
      activity.push({ date, playerId: `p${i}`, domains, chores: 0 });
    });
    const r = closeHouseNight(
      house,
      {
        date,
        householdId: "sim",
        players: players.map((s, i) => {
          const outing: OutingRecord[] = [];
          if (s.stamina >= tuning.expedition.staminaCost) {
            const seed = outingSeed(`p${i}`, date, 0);
            const eventIds = planOuting(seed, TIER1_EVENTS, tuning);
            outing.push({ seed, eventIds, choices: eventIds.map(() => 0) });
          }
          return { playerId: `p${i}`, earned: dayEarnings(logs[i]!, HABITS, tuning).resources, stamina: s.stamina, context: { level: s.progress.level, skills: s.skills, pity: s.pity }, outings: outing, meals: [] };
        }),
        builds: next ? [next.id] : [],
        crafts: [],
        skillThemes: [...new Set(players.flatMap((s) => s.skills.map((k) => k.theme)))],
        // The simulated pair accepts every visitor and spends Fridays at the Inn.
        visitorOrders: [...house.visitors.map((v) => ({ playerId: "p0", kind: "accept" as const, ref: v.id })), ...(weekday(date) === 4 ? [{ playerId: "p0", kind: "inn" as const, ref: "inn" }] : [])],
        activity: activity.slice(-28),
        content: { upgrades: UPGRADES, recipes: RECIPES, items: ITEMS, events: TIER1_EVENTS, visitors: VISITORS, recruits: RECRUITS },
      },
      tuning,
    );
    for (const e of r.events) {
      if (e.type === "built") builtOnDay[e.upgradeId] = n + 1;
      if (e.type === "outing") {
        outings += 1;
        outingCoins += e.result.loot.resources?.coins ?? 0;
      }
      if (e.type === "income") allCoins += e.resources.coins ?? 0;
      if (e.type === "visitor_arrived") visitors += 1;
      if (e.type === "quest_done") questsDone += 1;
      if (e.type === "quest_expired") questsExpired += 1;
    }
    house = r.house;
    players = players.map((s, i) =>
      closeDay(s, { date, focusDomains: FOCUS, habits: HABITS, goals: allGoals, pauses: [], logs: logs[i]!, playerId: `p${i}`, className: "[Rider]", catalog: SKILL_CATALOG, house: r.players[`p${i}`]! }, tuning).state,
    );
  }
  return { builtOnDay, outings, outingCoinShare: outingCoins / Math.max(1, outingCoins + allCoins), visitors, questsDone, questsExpired, recruits: [...house.recruits] };
}

export function houseReport(r: HouseResult): string {
  const lines = ["House: two steady players, the next upgrade ordered every night, one outing each when stamina allows"];
  for (const u of UPGRADES.slice(1)) {
    const day = r.builtOnDay[u.id];
    lines.push(`  ${u.name.padEnd(28)} ${day ? `day ${day} (week ${(day / 7).toFixed(1)})` : "not in 120 days"}${u.needsSkillTheme ? `  needs a ${u.needsSkillTheme} Skill` : ""}`);
  }
  lines.push(`  outings in 120 days: ${r.outings}; outings' share of coins: ${Math.round(r.outingCoinShare * 100)}%`);
  lines.push(`  visitors in 120 days: ${r.visitors}; quests done ${r.questsDone}, expired ${r.questsExpired}; recruits: ${r.recruits.join(", ") || "none"}`);
  return lines.join("\n");
}
