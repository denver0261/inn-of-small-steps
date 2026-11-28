import { INN_PALETTE, INN_UPGRADE_ART, SCENE_HEIGHT, SCENE_WIDTH, UPGRADES, VISITOR_ART } from "@inn/content";
import { describe, expect, it } from "vitest";
import { composeInn, visitorPixels } from "../src/game/innScene.ts";

describe("the Inn scene", () => {
  it("has art for every upgrade on the ladder", () => {
    for (const u of UPGRADES) expect(INN_UPGRADE_ART[u.id], u.id).toBeDefined();
  });

  it("draws the full grid with every upgrade built, every pixel a color", () => {
    const px = composeInn(UPGRADES.map((u) => u.id));
    expect(px).toHaveLength(SCENE_HEIGHT);
    for (const row of px) {
      expect(row).toHaveLength(SCENE_WIDTH);
      for (const c of row) expect(c).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it("changes as the house is built", () => {
    const start = composeInn(["cots"]);
    const kitchen = composeInn(["cots", "kitchen"]);
    // The ground-floor window lights up with the kitchen.
    expect(start[35]?.[27]).toBe(INN_PALETTE.N);
    expect(kitchen[35]?.[27]).toBe(INN_PALETTE.Y);
    // The guest room swaps the door frame for the Wandering Inn's blue.
    expect(composeInn(["cots", "guest_room"])[33]?.[36]).toBe(INN_PALETTE.O);
  });

  it("draws a visitor at its own size", () => {
    const v = visitorPixels();
    expect(v).toHaveLength(VISITOR_ART.length);
    expect(v[0]?.[0]).toBeNull();
  });
});
