import { describe, expect, it } from "vitest";
import { activityFrom, describeReward, innScene, questView } from "../src/game/visitors.ts";

const habits = [
  { id: "eat", name: "Eating well", domain: "nourish" as const, tier: "normal" as const, tinyVersion: "x", playerId: "p1", allowTap: true },
  { id: "tidy", name: "Tidying", domain: "home" as const, tier: "normal" as const, tinyVersion: "x", playerId: "p1", allowTap: true },
];
const log = (habitId: string, date: string, extra = {}) => ({ id: `${habitId}${date}`, playerId: "p1", habitId, date, kind: "full" as const, source: "tap" as const, ...extra });

describe("visitors on the house screen", () => {
  it("counts logs by domain and chores, per player and day", () => {
    const a = activityFrom([log("eat", "2027-01-05"), log("tidy", "2027-01-05", { choreId: "c1" }), log("eat", "2027-01-06")], habits);
    expect(a).toEqual([
      { date: "2027-01-05", playerId: "p1", domains: { nourish: 1, home: 1 }, chores: 1 },
      { date: "2027-01-06", playerId: "p1", domains: { nourish: 1 }, chores: 0 },
    ]);
  });

  it("shows a quest's progress so far", () => {
    const quest = { id: "q", templateId: "gnoll_butcher", acceptedBy: "p1", startDate: "2027-01-05", endDate: "2027-01-08" };
    const v = questView(quest, activityFrom([log("eat", "2027-01-05"), log("eat", "2027-01-06")], habits), "2027-01-06");
    expect(v).toMatchObject({ done: 2, target: 3, met: false, ask: "Eat well three days running." });
  });

  it("keeps the same Inn scene all day for a player", () => {
    expect(innScene("p1", "2027-01-05")).toBe(innScene("p1", "2027-01-05"));
  });

  it("writes rewards in words", () => {
    expect(describeReward({ goodwill: 3, coins: 0, supplies: 15 }, "worker")).toBe("3 goodwill, 15 supplies, someone who stays on to help");
  });
});
