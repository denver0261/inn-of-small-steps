import { DEFAULT_TUNING, NEW_HOUSE, NEW_PLAYER_STATE } from "@inn/engine";
import { describe, expect, it } from "vitest";
import { describeLoot, previewOutings, sceneLines, staminaLeft } from "../src/game/house.ts";

describe("the house screen", () => {
  it("describes the house from its upgrades and the real rooms' chores", () => {
    const lines = sceneLines({ ...NEW_HOUSE, upgrades: ["cots", "kitchen"] }, [{ id: "r1", name: "Kitchen" }], [{ id: "c", title: "Sweep", roomId: "r1", size: "normal", createdOn: "2027-01-01" }], "2027-01-03");
    expect(lines).toHaveLength(3);
    expect(lines[2]).toBe("Dust is gathering in the kitchen.");
  });

  it("counts stamina left after today's outings", () => {
    expect(staminaLeft({ ...NEW_PLAYER_STATE, stamina: 25 }, 2, DEFAULT_TUNING)).toBe(5);
    expect(staminaLeft({ ...NEW_PLAYER_STATE, stamina: 5 }, 1, DEFAULT_TUNING)).toBe(0);
  });

  it("previews outings exactly, carrying bad-luck protection between them", () => {
    const outings = [{ index: 1, choices: [0, 0, 0] }, { index: 0, choices: [1, 1, 1] }];
    const a = previewOutings({ ...NEW_PLAYER_STATE, pity: 2 }, "p1", "2027-01-04", outings, DEFAULT_TUNING);
    expect(a.map((o) => o.index)).toEqual([0, 1]);
    expect(a.every((o) => o.finished && o.eventIds.length === 3)).toBe(true);
    expect(previewOutings({ ...NEW_PLAYER_STATE, pity: 2 }, "p1", "2027-01-04", outings, DEFAULT_TUNING)).toEqual(a);
  });

  it("writes loot in words", () => {
    expect(describeLoot({ resources: { coins: 5, supplies: 0 }, items: { herbs: 2 } })).toBe("5 coins, Floodplain herbs ×2");
    expect(describeLoot({})).toBe("nothing but the story");
  });
});
