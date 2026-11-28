import { describe, expect, it } from "vitest";
import { ITEMS, RECIPES, RECRUITS, SKILL_CATALOG, TIER1_EVENTS, UPGRADES, VISITORS } from "../src/index.ts";

const itemIds = new Set(ITEMS.map((i) => i.id));

describe("house content", () => {
  it("has a ladder with one upgrade per step from 1, the first free", () => {
    expect(UPGRADES.map((u) => u.step)).toEqual(UPGRADES.map((_, i) => i + 1));
    expect(UPGRADES[0]?.cost).toEqual({});
  });

  it("only refers to items that exist", () => {
    for (const r of RECIPES) expect(itemIds.has(r.output.itemId)).toBe(true);
    for (const e of TIER1_EVENTS) for (const c of e.choices) for (const o of [c.success, c.failure]) for (const id of Object.keys(o.loot.items ?? {})) expect(itemIds.has(id), `${e.id}: ${id}`).toBe(true);
  });

  it("has unique ids and enough events for an outing", () => {
    for (const list of [ITEMS, RECIPES, UPGRADES, TIER1_EVENTS, SKILL_CATALOG]) expect(new Set(list.map((x) => x.id)).size).toBe(list.length);
    expect(TIER1_EVENTS.length).toBeGreaterThanOrEqual(12);
  });

  it("gives food stamina and trophies no stats", () => {
    for (const i of ITEMS.filter((x) => x.kind === "food")) expect(i.stamina).toBeGreaterThan(0);
    for (const i of ITEMS.filter((x) => x.kind === "trophy")) expect(i.stamina).toBeUndefined();
  });
});

describe("visitor content", () => {
  it("refers only to upgrades and recruits that exist", () => {
    for (const v of VISITORS) {
      if (v.needsUpgrade) expect(UPGRADES.some((u) => u.id === v.needsUpgrade), v.id).toBe(true);
      if (v.reward.recruit) expect(RECRUITS.some((r) => r.id === v.reward.recruit), v.id).toBe(true);
    }
  });

  it("never asks for more physical therapy: no quest targets the Recovery domain", () => {
    for (const v of VISITORS) expect(v.quest.domain).not.toBe("recovery");
  });

  it("has every quest measurable: domain quests name a domain, chores quests don't", () => {
    for (const v of VISITORS) if (v.quest.kind !== "chores") expect(v.quest.domain).toBeDefined();
    expect(VISITORS.filter((v) => !v.fromInn).length).toBeGreaterThanOrEqual(4);
  });
});
