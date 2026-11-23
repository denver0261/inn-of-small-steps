import { describe, expect, it } from "vitest";
import { addXp, DEFAULT_TUNING as T, NEW_PLAYER, xpToNext, xpToReach } from "../src/index.ts";

describe("level curve", () => {
  it("costs 20 * L^1.8 to go from L to L+1", () => {
    expect(xpToNext(1, T)).toBe(20);
    expect(xpToNext(2, T)).toBe(70);
    expect(xpToNext(9, T)).toBe(Math.round(20 * 9 ** 1.8));
  });

  it("puts Level 10 about 7 weeks out at 75 XP a day, as the design targets", () => {
    const days = xpToReach(10, T) / 75;
    expect(days).toBeGreaterThan(45);
    expect(days).toBeLessThan(56);
  });
});

describe("addXp", () => {
  it("grants Level 1 on the first night even with no XP", () => {
    const r = addXp(NEW_PLAYER, 0, T);
    expect(r.progress.level).toBe(1);
    expect(r.levelsReached).toEqual([1]);
  });

  it("can cross several levels in one night and carries the remainder", () => {
    const r = addXp({ level: 1, xpIntoLevel: 0, totalXp: 0 }, 20 + 70 + 5, T);
    expect(r.levelsReached).toEqual([2, 3]);
    expect(r.progress).toEqual({ level: 3, xpIntoLevel: 5, totalXp: 95 });
  });

  it("rejects negative XP: levels are never lost", () => {
    expect(() => addXp(NEW_PLAYER, -1, T)).toThrow();
  });
});
