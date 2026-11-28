import { DEFAULT_TUNING, NEW_PLAYER_STATE, type PlayerState } from "@inn/engine";
import { describe, expect, it } from "vitest";
import { displayClass, graceLeft, graceSkill, levelProgress, roman, skillView } from "../src/game/character.ts";

const MON = "2027-01-04";
const withWind: PlayerState = { ...NEW_PLAYER_STATE, progress: { level: 3, xpIntoLevel: 30, totalXp: 100 }, skills: [{ defId: "second_wind", theme: "endurance", tier: 1, grantedLevel: 2 }] };

describe("the character sheet", () => {
  it("shows the evolved class once chosen, by its System name when it has one", () => {
    expect(displayClass("[Rider]", NEW_PLAYER_STATE, {})).toBe("[Rider]");
    const evolved = { ...NEW_PLAYER_STATE, evolution: { id: "evo_rest", domain: "rest" as const, fallbackName: "[Dawn Rider]" } };
    expect(displayClass("[Rider]", evolved, {})).toBe("[Dawn Rider]");
    expect(displayClass("[Rider]", evolved, { evo_rest: { name: "[Rider of First Light]", text: "" } })).toBe("[Rider of First Light]");
  });

  it("names a Skill with the System's name or the catalog's, and fills in its numbers", () => {
    expect(skillView({ defId: "long_road", tier: 2 }, {})).toMatchObject({ name: "[Longer Road]", summary: "+15% XP on Endurance habits." });
    expect(skillView({ defId: "long_road", tier: 1 }, { "long_road:1": { name: "[Floodplain Miles]", text: "Roads remember." } })).toMatchObject({ name: "[Floodplain Miles]", flavor: "Roads remember." });
    expect(skillView({ defId: "long_road", tier: 1 }, { "long_road:1": { name: "[Long Road]", text: "+10% XP on Endurance habits." } }).flavor).toBeUndefined();
  });

  it("measures progress toward the next level", () => {
    expect(levelProgress(withWind, DEFAULT_TUNING).need).toBeGreaterThan(30);
    expect(levelProgress(NEW_PLAYER_STATE, DEFAULT_TUNING).share).toBe(0);
  });

  it("counts grace charges left this week, net of tonight's pending ones", () => {
    expect(graceLeft(withWind, "endurance", MON, 0)).toBe(1);
    expect(graceLeft(withWind, "endurance", MON, 1)).toBe(0);
    expect(graceLeft(withWind, "home", MON, 0)).toBe(0);
    const spent = { ...withWind, graceUsed: { weekStart: MON, byDef: { second_wind: 1 } } };
    expect(graceLeft(spent, "strength", "2027-01-06", 0)).toBe(0);
    expect(graceLeft(spent, "strength", "2027-01-11", 0)).toBe(1); // a new week
    expect(graceSkill(withWind, "recovery")?.defId).toBe("second_wind");
  });

  it("writes tiers as numerals", () => {
    expect([1, 2, 3].map(roman)).toEqual(["I", "II", "III"]);
  });
});
