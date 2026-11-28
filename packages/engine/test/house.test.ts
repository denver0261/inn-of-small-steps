import type { ExpeditionEvent, ItemDef, Recipe, Upgrade } from "@inn/schema";
import { describe, expect, it } from "vitest";
import {
  closeDay,
  closeHouseNight,
  dayEarnings,
  DEFAULT_TUNING as T,
  masteryRank,
  migrateState,
  NEW_HOUSE,
  NEW_PLAYER_STATE,
  nextUpgrade,
  outingSeed,
  planOuting,
  resolveOuting,
  roomLook,
  type HouseNightInput,
  type HousePlayerInput,
} from "../src/index.ts";
import { baseInput, log, MON, ride, tidy } from "./fixtures.ts";

const EVENTS: ExpeditionEvent[] = ["a", "b", "c", "d"].map((id) => ({
  id,
  tier: 1,
  place: "Liscor",
  setup: `Event ${id}`,
  choices: [
    { label: "easy", theme: "endurance", difficulty: 2, success: { text: "won", loot: { resources: { coins: 5 } } }, failure: { text: "lost", loot: {} } },
    { label: "hard", theme: "strength", difficulty: 20, success: { text: "won big", loot: { resources: { coins: 50 } } }, failure: { text: "lost", loot: { resources: { coins: 1 } } } },
  ],
}));
const ITEMS: ItemDef[] = [
  { id: "stew", name: "Stew", kind: "food", stamina: 5, description: "x" },
  { id: "claw", name: "Claw", kind: "trophy", description: "x" },
];
const UPGRADES: Upgrade[] = [
  { id: "cots", step: 1, name: "Cots", description: "x", cost: {}, scene: "x" },
  { id: "kitchen", step: 2, name: "Kitchen", description: "x", cost: { coins: 10 }, scene: "x" },
  { id: "garden", step: 3, name: "Garden", description: "x", cost: { coins: 5 }, needsSkillTheme: "spirit", scene: "x" },
  { id: "guest", step: 4, name: "Guest room", description: "x", cost: { coins: 5 }, scene: "x" },
];
const RECIPES: Recipe[] = [
  { id: "stew", name: "Stew", station: "cookfire", cost: { supplies: 4 }, output: { itemId: "stew", qty: 2 }, description: "x" },
  { id: "feast", name: "Feast", station: "kitchen", cost: { supplies: 1 }, output: { itemId: "stew", qty: 1 }, description: "x" },
];
const content = { upgrades: UPGRADES, recipes: RECIPES, items: ITEMS, events: EVENTS };

const player = (over: Partial<HousePlayerInput> = {}): HousePlayerInput => ({
  playerId: "p1",
  earned: {},
  stamina: 30,
  context: { level: 1, skills: [], pity: 0 },
  outings: [],
  meals: [],
  ...over,
});
const night = (over: Partial<HouseNightInput> = {}): HouseNightInput => ({ date: MON, householdId: "h1", players: [player()], builds: [], crafts: [], skillThemes: [], content, ...over });

describe("earnings", () => {
  it("pays coins for every log and the rest by domain and tier", () => {
    const e = dayEarnings([log("ride", MON), log("tidy", MON, { kind: "tiny" })], [ride, tidy], T);
    expect(e.resources).toEqual({ coins: 3 + 1, supplies: 1, mana: 0, goodwill: 0 });
    expect(e.stamina).toBe(5);
  });
});

describe("outings", () => {
  const seed = outingSeed("p1", MON, 0);

  it("draws distinct events and replays identically from the seed", () => {
    const ids = planOuting(seed, EVENTS, T);
    expect(new Set(ids).size).toBe(3);
    expect(planOuting(seed, EVENTS, T)).toEqual(ids);
    const record = { seed, eventIds: ids, choices: [0, 1, 0] };
    const ctx = { level: 1, skills: [], pity: 0 };
    expect(resolveOuting(record, EVENTS, ctx, [], T)).toEqual(resolveOuting(record, EVENTS, ctx, [], T));
  });

  it("adds a Skill in the choice's theme to the roll", () => {
    const record = { seed, eventIds: ["a"], choices: [1] };
    const plain = resolveOuting(record, EVENTS, { level: 1, skills: [], pity: 0 }, [], T).steps[0]!;
    const strong = resolveOuting(record, EVENTS, { level: 1, skills: [{ defId: "x", theme: "strength", tier: 3, grantedLevel: 2 }], pity: 0 }, [], T).steps[0]!;
    expect(strong.roll).toBe(plain.roll);
    expect(strong.bonus - plain.bonus).toBe(6);
  });

  it("finds a rare trophy eventually: bad-luck protection raises the odds each dry outing", () => {
    let pity = 0;
    let found = -1;
    for (let n = 0; n < 40 && found < 0; n++) {
      const r = resolveOuting({ seed: outingSeed("p1", MON, n), eventIds: ["a"], choices: [0] }, EVENTS, { level: 1, skills: [], pity }, ["claw"], T);
      if (r.rare) found = n;
      pity = r.pity;
    }
    expect(found).toBeGreaterThanOrEqual(0);
    expect(found).toBeLessThan(20); // by then the chance is 100%
  });

  it("an abandoned outing keeps what it found but never rolls for a rare", () => {
    const r = resolveOuting({ seed, eventIds: ["a", "b", "c"], choices: [0] }, EVENTS, { level: 1, skills: [], pity: 99 }, ["claw"], T);
    expect(r.steps).toHaveLength(1);
    expect(r.rare).toBeUndefined();
    expect(r.pity).toBe(99);
  });
});

describe("the house's night", () => {
  it("adds income, then outing loot, and spends stamina per outing", () => {
    const outing = { seed: "s", eventIds: ["a"], choices: [0] };
    const r = closeHouseNight(NEW_HOUSE, night({ players: [player({ earned: { coins: 3, supplies: 2 }, stamina: 15, outings: [outing, outing] })] }), T);
    expect(r.events.map((e) => e.type)).toEqual(["income", "outing", "outing_refused"]);
    expect(r.house.resources.coins).toBe(3 + 5);
    expect(r.players.p1).toMatchObject({ staminaSpent: 10 });
  });

  it("serves meals from the stash and refuses what isn't there", () => {
    const house = { ...NEW_HOUSE, stash: { stew: 1 } };
    const r = closeHouseNight(house, night({ players: [player({ meals: ["stew", "stew"] })] }), T);
    expect(r.players.p1?.staminaFromMeals).toBe(5);
    expect(r.events.filter((e) => e.type === "meal_refused")).toHaveLength(1);
    expect(r.house.stash.stew).toBe(0);
  });

  it("builds the ladder in order, only when affordable and with any Skill it needs", () => {
    const rich = { ...NEW_HOUSE, resources: { coins: 100, supplies: 0, mana: 0, goodwill: 0 } };
    const r = closeHouseNight(rich, night({ builds: ["garden", "kitchen", "garden", "kitchen"] }), T);
    expect(r.events.filter((e) => e.type !== "income")).toEqual([
      { type: "build_refused", upgradeId: "garden", reason: "order" },
      { type: "built", upgradeId: "kitchen" },
    ]);
    const withSpirit = closeHouseNight(r.house, night({ date: "2024-01-02", builds: ["garden"], skillThemes: ["spirit"] }), T);
    expect(withSpirit.house.upgrades).toEqual(["cots", "kitchen", "garden"]);
    // The garden is optional: the guest room above it doesn't wait for it.
    const noSpirit = closeHouseNight(r.house, night({ date: "2024-01-02", builds: ["guest"] }), T);
    expect(noSpirit.house.upgrades).toEqual(["cots", "kitchen", "guest"]);
    const poor = closeHouseNight(NEW_HOUSE, night({ builds: ["kitchen"] }), T);
    expect(poor.events.at(-1)).toEqual({ type: "build_refused", upgradeId: "kitchen", reason: "cost" });
    expect(nextUpgrade(NEW_HOUSE, UPGRADES)?.id).toBe("kitchen");
  });

  it("crafts at the cookfire from day one, needs the kitchen for kitchen recipes, and counts mastery", () => {
    const stocked = { ...NEW_HOUSE, resources: { coins: 0, supplies: 9, mana: 0, goodwill: 0 } };
    const r = closeHouseNight(stocked, night({ crafts: ["stew", "feast", "stew", "stew"] }), T);
    expect(r.events.filter((e) => e.type !== "income").map((e) => e.type)).toEqual(["crafted", "craft_refused", "crafted", "craft_refused"]);
    expect(r.house.stash.stew).toBe(4);
    expect(r.house.mastery.stew).toBe(2);
    expect([0, 5, 15].map((n) => masteryRank(n, T))).toEqual(["Novice", "Skilled", "Master"]);
  });

  it("is idempotent", () => {
    const once = closeHouseNight(NEW_HOUSE, night({ players: [player({ earned: { coins: 3 } })] }), T);
    const twice = closeHouseNight(once.house, night({ players: [player({ earned: { coins: 3 } })] }), T);
    expect(twice.events).toEqual([]);
    expect(twice.house).toBe(once.house);
  });
});

describe("stamina in the player's night", () => {
  it("earns from logs, spends on outings, adds meals and caps at two days' worth", () => {
    const first = closeDay(NEW_PLAYER_STATE, baseInput(MON, [log("ride", MON)]), T).state;
    expect(first.stamina).toBe(5);
    const next = closeDay({ ...first, stamina: 28 }, baseInput("2024-01-02", [log("ride", "2024-01-02", { tier: "big" })], { house: { staminaSpent: 10, staminaFromMeals: 12, pity: 3 } }), T).state;
    expect(next.stamina).toBe(T.economy.staminaCap);
    expect(next.pity).toBe(3);
  });

  it("upgrades an M2 (v1) save with no stamina", () => {
    const { stamina: _, pity: __, ...v1 } = { ...NEW_PLAYER_STATE, version: 1 };
    expect(migrateState(v1)).toMatchObject({ stamina: 0, pity: 0, version: 2 });
  });
});

describe("rooms", () => {
  const chore = (over: object) => ({ id: "c", title: "Sweep", roomId: "kitchen", size: "normal" as const, createdOn: MON, ...over });

  it("look tidy, dusty or cluttered by how overdue their chores are", () => {
    expect(roomLook([], "kitchen", MON)).toBe("tidy");
    expect(roomLook([chore({})], "kitchen", "2024-01-02")).toBe("dusty");
    expect(roomLook([chore({})], "kitchen", "2024-01-06")).toBe("cluttered");
    expect(roomLook([chore({})], "bedroom", "2024-01-06")).toBe("tidy");
  });
});
