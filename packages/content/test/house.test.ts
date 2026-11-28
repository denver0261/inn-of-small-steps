import { describe, expect, it } from "vitest";
import { ITEMS, RECIPES, SKILL_CATALOG, TIER1_EVENTS, UPGRADES } from "../src/index.ts";

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
