import type { Domain, ExpeditionEvent, ItemDef, LocalDate, Loot, Recipe, Recruit, Resources, Upgrade, VisitorTemplate } from "@inn/schema";
import { addDays } from "./dates.ts";
import { addResources, canAfford, NO_RESOURCES, spend } from "./economy.ts";
import { resolveOuting, type ExpeditionContext, type OutingRecord, type OutingResult } from "./expedition.ts";
import { mulberry32, hashSeed, seeded } from "./rng.ts";
import { acceptOffer, arrivalChance, drawVisitor, eligibleVisitors, questProgress, type ActiveQuest, type DayActivity, type VisitorOffer } from "./visitors.ts";
import type { Tuning } from "./tuning.ts";

/** Bumped when the saved shape changes. */
export const HOUSE_VERSION = 2;

/** The shared house: both players add to it, and nothing in it ever decays. */
export interface HouseState {
  version: typeof HOUSE_VERSION;
  resources: Required<Resources>;
  /** Upgrade ids built, in ladder order. Everyone starts with the first. */
  upgrades: readonly string[];
  /** Items in the shared stash, by id. */
  stash: Readonly<Record<string, number>>;
  /** Times each recipe has been made; mastery comes with practice. */
  mastery: Readonly<Record<string, number>>;
  /** Visitors waiting with an offer. */
  visitors: readonly VisitorOffer[];
  /** Accepted quests still running. */
  quests: readonly ActiveQuest[];
  /** Quests finished, by visitor template. */
  questsDone: Readonly<Record<string, number>>;
  /** People who stayed on and help every night. */
  recruits: readonly string[];
  lastClosed?: LocalDate;
}

export const NEW_HOUSE: HouseState = { version: HOUSE_VERSION, resources: { ...NO_RESOURCES }, upgrades: ["cots"], stash: {}, mastery: {}, visitors: [], quests: [], questsDone: {}, recruits: [] };

export function migrateHouse(saved: unknown): HouseState {
  const h = saved as Partial<HouseState> & { version?: number };
  if (h.version === HOUSE_VERSION) return h as HouseState;
  // v1 (M3): no visitors yet.
  if (h.version === 1) return { ...(h as Omit<HouseState, "version" | "visitors" | "quests" | "questsDone" | "recruits">), version: HOUSE_VERSION, visitors: [], quests: [], questsDone: {}, recruits: [] };
  throw new Error(`unknown house state version: ${String(h.version)}`);
}

export interface HouseContent {
  upgrades: readonly Upgrade[];
  recipes: readonly Recipe[];
  items: readonly ItemDef[];
  events: readonly ExpeditionEvent[];
  visitors: readonly VisitorTemplate[];
  recruits: readonly Recruit[];
}

/** One player's part in the house's night. */
export interface HousePlayerInput {
  playerId: string;
  /** Resources their logs earned today (see `dayEarnings`). */
  earned: Resources;
  /** Their stamina and expedition standing as of the last night. */
  stamina: number;
  context: ExpeditionContext;
  /** Outings started today, in order. */
  outings: readonly OutingRecord[];
  /** Food from the stash they chose to eat tonight. */
  meals: readonly string[];
}

export interface HouseNightInput {
  date: LocalDate;
  householdId: string;
  players: readonly HousePlayerInput[];
  /** Upgrade ids ordered today, in order. */
  builds: readonly string[];
  /** Recipe ids ordered today, in order. */
  crafts: readonly string[];
  /** Skill themes anyone in the house holds (the garden needs Spirit). */
  skillThemes: readonly Domain[];
  /** Today's visitor orders, in order: accept or decline an offer, serve a visitor, an evening at the Inn. */
  visitorOrders: readonly { playerId: string; kind: "accept" | "decline" | "serve" | "inn"; ref: string }[];
  /** Everyone's activity over the active quests' windows, through `date`. */
  activity: readonly DayActivity[];
  content: HouseContent;
}

/** What the night settled for each player, fed into their own `closeDay`. */
export interface HousePlayerResult {
  staminaSpent: number;
  staminaFromMeals: number;
  pity: number;
}

export type HouseEvent =
  | { type: "income"; playerId: string; resources: Resources }
  | { type: "outing"; playerId: string; index: number; result: OutingResult }
  | { type: "outing_refused"; playerId: string; index: number; reason: "stamina" }
  | { type: "meal"; playerId: string; itemId: string; stamina: number }
  | { type: "meal_refused"; playerId: string; itemId: string }
  | { type: "built"; upgradeId: string }
  | { type: "build_refused"; upgradeId: string; reason: "built" | "order" | "skill" | "cost" }
  | { type: "crafted"; recipeId: string; itemId: string; qty: number; fine: boolean }
  | { type: "craft_refused"; recipeId: string; reason: "station" | "cost" | "unknown" }
  | { type: "quest_accepted"; playerId: string; quest: ActiveQuest }
  | { type: "visitor_declined"; offerId: string }
  | { type: "served"; offerId: string; itemId: string; goodwill: number }
  | { type: "inn_evening"; playerId: string; goodwill: number }
  | { type: "recruit_income"; recruitId: string; resources: Resources }
  | { type: "quest_done"; quest: ActiveQuest; reward: Resources; recruit?: string }
  | { type: "quest_expired"; quest: ActiveQuest; done: number; target: number }
  | { type: "visitor_left"; offerId: string }
  | { type: "visitor_arrived"; offer: VisitorOffer };

export interface HouseNightResult {
  house: HouseState;
  events: HouseEvent[];
  players: Record<string, HousePlayerResult>;
}

/**
 * The house's night, run once every housemate has closed the day. Order matters and is
 * fixed: income, outings, meals, building, then crafting, so tonight's income can pay for
 * tonight's orders. Pure and idempotent: a night already closed returns the house as is.
 */
export function closeHouseNight(house: HouseState, input: HouseNightInput, tuning: Tuning): HouseNightResult {
  const players: Record<string, HousePlayerResult> = {};
  if (house.lastClosed !== undefined && input.date <= house.lastClosed) {
    for (const p of input.players) players[p.playerId] = { staminaSpent: 0, staminaFromMeals: 0, pity: p.context.pity };
    return { house, events: [], players };
  }
  const events: HouseEvent[] = [];
  let resources = house.resources;
  const stash: Record<string, number> = { ...house.stash };
  const mastery: Record<string, number> = { ...house.mastery };
  const upgrades = [...house.upgrades];
  const addLoot = (loot: Loot) => {
    resources = addResources(resources, loot.resources ?? {});
    for (const [id, n] of Object.entries(loot.items ?? {})) stash[id] = (stash[id] ?? 0) + n;
  };

  for (const p of input.players) {
    resources = addResources(resources, p.earned);
    events.push({ type: "income", playerId: p.playerId, resources: p.earned });
  }

  const rarePool = input.content.items.filter((i) => i.kind === "trophy").map((i) => i.id);
  for (const p of input.players) {
    let stamina = p.stamina;
    let spent = 0;
    let pity = p.context.pity;
    p.outings.forEach((outing, index) => {
      if (stamina < tuning.expedition.staminaCost) {
        events.push({ type: "outing_refused", playerId: p.playerId, index, reason: "stamina" });
        return;
      }
      stamina -= tuning.expedition.staminaCost;
      spent += tuning.expedition.staminaCost;
      const result = resolveOuting(outing, input.content.events, { ...p.context, pity }, rarePool, tuning);
      pity = result.pity;
      addLoot(result.loot);
      events.push({ type: "outing", playerId: p.playerId, index, result });
    });
    players[p.playerId] = { staminaSpent: spent, staminaFromMeals: 0, pity };
  }

  for (const p of input.players) {
    for (const itemId of p.meals) {
      const def = input.content.items.find((i) => i.id === itemId);
      if (!def?.stamina || (stash[itemId] ?? 0) < 1) {
        events.push({ type: "meal_refused", playerId: p.playerId, itemId });
        continue;
      }
      stash[itemId] = stash[itemId]! - 1;
      players[p.playerId]!.staminaFromMeals += def.stamina;
      events.push({ type: "meal", playerId: p.playerId, itemId, stamina: def.stamina });
    }
  }

  for (const upgradeId of new Set(input.builds)) {
    const u = input.content.upgrades.find((x) => x.id === upgradeId);
    const reason = !u
      ? "order"
      : upgrades.includes(u.id)
        ? "built"
        : !ladderReady(u, upgrades, input.content.upgrades)
          ? "order"
          : u.needsSkillTheme && !input.skillThemes.includes(u.needsSkillTheme)
            ? "skill"
            : !canAfford(resources, u.cost)
              ? "cost"
              : undefined;
    if (reason || !u) {
      events.push({ type: "build_refused", upgradeId, reason: reason ?? "order" });
      continue;
    }
    resources = spend(resources, u.cost);
    upgrades.push(u.id);
    events.push({ type: "built", upgradeId: u.id });
  }

  input.crafts.forEach((recipeId, i) => {
    const r = input.content.recipes.find((x) => x.id === recipeId);
    if (!r) return events.push({ type: "craft_refused", recipeId, reason: "unknown" });
    if (r.station === "kitchen" && !upgrades.includes("kitchen")) return events.push({ type: "craft_refused", recipeId, reason: "station" });
    if (!canAfford(resources, r.cost)) return events.push({ type: "craft_refused", recipeId, reason: "cost" });
    resources = spend(resources, r.cost);
    const made = mastery[r.id] ?? 0;
    const chance = made >= tuning.crafting.masterAt ? tuning.crafting.fineChance.master : made >= tuning.crafting.skilledAt ? tuning.crafting.fineChance.skilled : tuning.crafting.fineChance.novice;
    const fine = mulberry32(hashSeed(input.householdId, input.date, "craft", String(i)))() < chance;
    const qty = r.output.qty + (fine ? 1 : 0);
    stash[r.output.itemId] = (stash[r.output.itemId] ?? 0) + qty;
    mastery[r.id] = made + 1;
    events.push({ type: "crafted", recipeId: r.id, itemId: r.output.itemId, qty, fine });
  });

  // Visitors: tonight's answers, the recruits' help, quests, departures, then tomorrow's knocks.
  let offers = [...house.visitors];
  let quests = [...house.quests];
  const questsDone: Record<string, number> = { ...house.questsDone };
  const recruits = [...house.recruits];
  const template = (id: string) => input.content.visitors.find((t) => t.id === id);
  const innPlayers = new Set<string>();
  for (const o of input.visitorOrders) {
    if (o.kind === "inn") {
      if (innPlayers.has(o.playerId)) continue;
      innPlayers.add(o.playerId);
      resources = addResources(resources, { goodwill: tuning.visitors.innGoodwill });
      events.push({ type: "inn_evening", playerId: o.playerId, goodwill: tuning.visitors.innGoodwill });
      continue;
    }
    const offer = offers.find((x) => x.id === o.ref);
    const t = offer && template(offer.templateId);
    if (!offer || !t) continue;
    if (o.kind === "accept") {
      const quest = acceptOffer(offer, t, o.playerId, input.date);
      quests.push(quest);
      offers = offers.filter((x) => x.id !== offer.id);
      events.push({ type: "quest_accepted", playerId: o.playerId, quest });
    } else if (o.kind === "decline") {
      offers = offers.filter((x) => x.id !== offer.id);
      events.push({ type: "visitor_declined", offerId: offer.id });
    } else if (o.kind === "serve") {
      const dish = input.content.items.find((i) => i.goodwill && (stash[i.id] ?? 0) > 0);
      if (!dish?.goodwill) continue;
      stash[dish.id] = stash[dish.id]! - 1;
      resources = addResources(resources, { goodwill: dish.goodwill });
      events.push({ type: "served", offerId: offer.id, itemId: dish.id, goodwill: dish.goodwill });
    }
  }

  for (const id of recruits) {
    const r = input.content.recruits.find((x) => x.id === id);
    if (!r) continue;
    resources = addResources(resources, r.perNight);
    events.push({ type: "recruit_income", recruitId: id, resources: r.perNight });
  }

  for (const quest of [...quests]) {
    const t = template(quest.templateId);
    if (!t || input.date < quest.startDate) continue;
    const p = questProgress(quest, t.quest, input.activity, input.date);
    if (p.met) {
      resources = addResources(resources, t.reward.resources);
      const recruit = t.reward.recruit && !recruits.includes(t.reward.recruit) ? t.reward.recruit : undefined;
      if (recruit) recruits.push(recruit);
      questsDone[t.id] = (questsDone[t.id] ?? 0) + 1;
      quests = quests.filter((q) => q.id !== quest.id);
      events.push({ type: "quest_done", quest, reward: t.reward.resources, ...(recruit ? { recruit } : {}) });
    } else if (p.over) {
      quests = quests.filter((q) => q.id !== quest.id);
      events.push({ type: "quest_expired", quest, done: p.done, target: p.target });
    }
  }

  for (const offer of offers.filter((o) => o.leavesOn <= input.date)) events.push({ type: "visitor_left", offerId: offer.id });
  offers = offers.filter((o) => o.leavesOn > input.date);

  const rng = seeded(input.householdId, input.date, "visitors");
  const tomorrow = addDays(input.date, 1);
  const knock = (t: VisitorTemplate | undefined) => {
    if (!t || offers.length >= tuning.visitors.maxOffers) return;
    const offer: VisitorOffer = { id: `${t.id}:${tomorrow}`, templateId: t.id, arrivedOn: tomorrow, leavesOn: addDays(tomorrow, tuning.visitors.staysDays - 1) };
    offers.push(offer);
    events.push({ type: "visitor_arrived", offer });
  };
  const ctx = () => ({ upgrades, goodwill: resources.goodwill, innTonight: innPlayers.size > 0, busy: [...offers.map((o) => o.templateId), ...quests.map((q) => q.templateId)] });
  if (innPlayers.size > 0) knock(drawVisitor(eligibleVisitors(input.content.visitors, ctx(), true), resources.goodwill, rng, tuning));
  const rolls = upgrades.includes("guest_room") ? 2 : 1;
  for (let i = 0; i < rolls; i++) {
    if (rng() < arrivalChance(resources.goodwill, tuning)) knock(drawVisitor(eligibleVisitors(input.content.visitors, ctx(), false), resources.goodwill, rng, tuning));
  }

  return {
    house: { version: HOUSE_VERSION, resources, upgrades, stash, mastery, visitors: offers, quests, questsDone, recruits, lastClosed: input.date },
    events,
    players,
  };
}

/**
 * Whether the rungs below an upgrade are built. Skill-gated upgrades (the garden) are
 * optional: nothing above them waits on them.
 */
export function ladderReady(u: Upgrade, built: readonly string[], ladder: readonly Upgrade[]): boolean {
  return ladder.filter((x) => x.step < u.step && !x.needsSkillTheme).every((x) => built.includes(x.id));
}

/** Novice, Skilled or Master, from how many times a recipe has been made. */
export function masteryRank(made: number, tuning: Tuning): "Novice" | "Skilled" | "Master" {
  return made >= tuning.crafting.masterAt ? "Master" : made >= tuning.crafting.skilledAt ? "Skilled" : "Novice";
}

/** The next required upgrade on the ladder, if any (optional, Skill-gated rungs are skipped). */
export function nextUpgrade(house: HouseState, upgrades: readonly Upgrade[]): Upgrade | undefined {
  return [...upgrades].sort((a, b) => a.step - b.step).find((u) => !house.upgrades.includes(u.id) && !u.needsSkillTheme);
}
