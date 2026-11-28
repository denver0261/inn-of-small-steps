import { ITEMS, RECIPES, SKILL_CATALOG, TIER1_EVENTS, UPGRADES } from "@inn/content";
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
  type OutingRecord,
  type PlayerState,
  type Tuning,
} from "@inn/engine";
import { dayLogs, FOCUS, goals, HABITS, mulberry32, PROFILES } from "./profiles.ts";
import { START } from "./simulate.ts";

export interface HouseResult {
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

  for (let n = 0; n < days; n++) {
    const date = addDays(START, n);
    const logs = players.map((_, i) => dayLogs(steady, n, date, weekday(date), n >= 14, rngs[i]!));
    const next = nextUpgrade(house, UPGRADES);
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
        content: { upgrades: UPGRADES, recipes: RECIPES, items: ITEMS, events: TIER1_EVENTS },
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
    }
    house = r.house;
    players = players.map((s, i) =>
      closeDay(s, { date, focusDomains: FOCUS, habits: HABITS, goals: allGoals, pauses: [], logs: logs[i]!, playerId: `p${i}`, className: "[Rider]", catalog: SKILL_CATALOG, house: r.players[`p${i}`]! }, tuning).state,
    );
  }
  return { builtOnDay, outings, outingCoinShare: outingCoins / Math.max(1, outingCoins + allCoins) };
}

export function houseReport(r: HouseResult): string {
  const lines = ["House: two steady players, the next upgrade ordered every night, one outing each when stamina allows"];
  for (const u of UPGRADES.slice(1)) {
    const day = r.builtOnDay[u.id];
    lines.push(`  ${u.name.padEnd(28)} ${day ? `day ${day} (week ${(day / 7).toFixed(1)})` : "not in 120 days"}${u.needsSkillTheme ? `  needs a ${u.needsSkillTheme} Skill` : ""}`);
  }
  lines.push(`  outings in 120 days: ${r.outings}; outings' share of coins: ${Math.round(r.outingCoinShare * 100)}%`);
  return lines.join("\n");
}
