import type { VisitorTemplate } from "@inn/schema";
import { describe, expect, it } from "vitest";
import { closeHouseNight, DEFAULT_TUNING as T, migrateHouse, NEW_HOUSE, questProgress, type DayActivity, type HouseNightInput, type HouseState } from "../src/index.ts";

const MON = "2024-01-01";
const day = (n: number) => `2024-01-${String(n).padStart(2, "0")}`;
const t = (over: Partial<VisitorTemplate> & Pick<VisitorTemplate, "id">): VisitorTemplate => ({
  name: over.id,
  line: "Hello.",
  rarity: "common",
  fromInn: false,
  quest: { kind: "domain_count", domain: "strength", target: 2, days: 7, coop: false, ask: "Lift twice." },
  reward: { resources: { goodwill: 3, coins: 10 } },
  thanks: "Thanks.",
  ...over,
});
const LIFT = t({ id: "lifter", reward: { resources: { goodwill: 3, coins: 10 }, recruit: "helper" } });
const INN = t({ id: "regular", fromInn: true });
const YARD = t({ id: "sergeant", needsUpgrade: "yard" });
const act = (date: string, playerId: string, domains: DayActivity["domains"], chores = 0): DayActivity => ({ date, playerId, domains, chores });

const night = (house: HouseState, over: Partial<HouseNightInput> = {}) =>
  closeHouseNight(
    house,
    {
      date: MON,
      householdId: "h1",
      players: [],
      builds: [],
      crafts: [],
      skillThemes: [],
      visitorOrders: [],
      activity: [],
      content: { upgrades: [], recipes: [], items: [{ id: "platter", name: "Platter", kind: "food", stamina: 1, goodwill: 3, description: "x" }], events: [], visitors: [LIFT, INN, YARD], recruits: [{ id: "helper", name: "Helper", description: "x", perNight: { coins: 2 } }] },
      ...over,
    },
    T,
  );

describe("quest progress", () => {
  const quest = { id: "q", templateId: "lifter", acceptedBy: "p1", startDate: day(2), endDate: day(8) };

  it("counts logs in the domain within the window, solo quests only for who accepted", () => {
    const activity = [act(day(1), "p1", { strength: 1 }), act(day(3), "p1", { strength: 1 }), act(day(4), "p2", { strength: 1 })];
    expect(questProgress(quest, LIFT.quest, activity, day(5))).toEqual({ done: 1, target: 2, met: false, over: false });
    expect(questProgress(quest, { ...LIFT.quest, coop: true }, activity, day(5)).met).toBe(true);
  });

  it("needs days in a row for a daily quest", () => {
    const spec = { kind: "daily_domain" as const, domain: "home" as const, target: 3, days: 7, coop: false, ask: "x" };
    const gap = [2, 3, 5, 6].map((d) => act(day(d), "p1", { home: 1 }));
    expect(questProgress(quest, spec, gap, day(6)).done).toBe(2);
    expect(questProgress(quest, spec, [...gap, act(day(4), "p1", { home: 1 })], day(6)).met).toBe(true);
  });

  it("counts chores, and is over after its last day", () => {
    const spec = { kind: "chores" as const, target: 3, days: 7, coop: true, ask: "x" };
    expect(questProgress(quest, spec, [act(day(2), "p1", {}, 2), act(day(3), "p2", {}, 1)], day(3)).met).toBe(true);
    expect(questProgress(quest, spec, [], day(8)).over).toBe(true);
  });
});

describe("visitors in the house's night", () => {
  const withOffer = (templateId: string): HouseState => ({ ...NEW_HOUSE, visitors: [{ id: `${templateId}:${MON}`, templateId, arrivedOn: MON, leavesOn: day(3) }] });

  it("turns an accepted offer into a quest that starts tomorrow", () => {
    const r = night(withOffer("lifter"), { visitorOrders: [{ playerId: "p1", kind: "accept", ref: `lifter:${MON}` }] });
    expect(r.house.quests).toEqual([{ id: `lifter:${MON}`, templateId: "lifter", acceptedBy: "p1", startDate: day(2), endDate: day(8) }]);
    expect(r.house.visitors.some((v) => v.templateId === "lifter")).toBe(false);
  });

  it("pays a finished quest, keeps its recruit, and the recruit helps every night after", () => {
    const house: HouseState = { ...NEW_HOUSE, quests: [{ id: "q", templateId: "lifter", acceptedBy: "p1", startDate: MON, endDate: day(7) }] };
    const done = night(house, { activity: [act(MON, "p1", { strength: 2 })] });
    expect(done.events.find((e) => e.type === "quest_done")).toMatchObject({ recruit: "helper" });
    expect(done.house.resources).toMatchObject({ goodwill: 3, coins: 10 });
    expect(done.house.questsDone.lifter).toBe(1);
    const next = night(done.house, { date: day(2) });
    expect(next.events.find((e) => e.type === "recruit_income")).toEqual({ type: "recruit_income", recruitId: "helper", resources: { coins: 2 } });
  });

  it("lets an unfinished quest lapse at its end with no penalty", () => {
    const house: HouseState = { ...NEW_HOUSE, resources: { coins: 5, supplies: 0, mana: 0, goodwill: 2 }, quests: [{ id: "q", templateId: "lifter", acceptedBy: "p1", startDate: MON, endDate: MON }] };
    const r = night(house);
    expect(r.events.find((e) => e.type === "quest_expired")).toMatchObject({ done: 0, target: 2 });
    expect(r.house.resources.coins).toBe(5);
  });

  it("serves a platter for goodwill, and visitors leave if nobody answers", () => {
    const house = { ...withOffer("lifter"), stash: { platter: 1 } };
    const served = night(house, { visitorOrders: [{ playerId: "p1", kind: "serve", ref: `lifter:${MON}` }] });
    expect(served.house.resources.goodwill).toBe(3);
    const later = night(withOffer("lifter"), { date: day(3) });
    expect(later.events.some((e) => e.type === "visitor_left")).toBe(true);
  });

  it("an evening at the Inn earns goodwill once per player and always brings an Inn regular", () => {
    const r = night(NEW_HOUSE, { visitorOrders: [{ playerId: "p1", kind: "inn", ref: "inn" }, { playerId: "p1", kind: "inn", ref: "inn" }] });
    expect(r.events.filter((e) => e.type === "inn_evening")).toHaveLength(1);
    expect(r.house.visitors.map((v) => v.templateId)).toContain("regular");
    expect(r.house.visitors.find((v) => v.templateId === "regular")?.arrivedOn).toBe(day(2));
  });

  it("only sends visitors whose upgrade is built, never twice, and is deterministic", () => {
    const seen = new Set<string>();
    let house: HouseState = NEW_HOUSE;
    for (let n = 1; n <= 28; n++) {
      const r = night(house, { date: day(n) });
      for (const v of r.house.visitors) seen.add(v.templateId);
      const ids = r.house.visitors.map((v) => v.templateId);
      expect(new Set(ids).size).toBe(ids.length);
      expect(r.house.visitors.length).toBeLessThanOrEqual(T.visitors.maxOffers);
      house = r.house;
    }
    expect(seen.has("sergeant")).toBe(false);
    expect(seen.has("regular")).toBe(false);
    expect(night(NEW_HOUSE, { date: day(9) })).toEqual(night(NEW_HOUSE, { date: day(9) }));
  });

  it("upgrades an M3 (v1) house with no visitors", () => {
    const { visitors: _, quests: __, questsDone: ___, recruits: ____, ...v1 } = { ...NEW_HOUSE, version: 1 };
    expect(migrateHouse(v1)).toMatchObject({ version: 2, visitors: [], quests: [], recruits: [] });
  });
});
