import { describe, expect, it } from "vitest";
import { lineKind, shouldReveal } from "../src/game/morning.ts";

describe("the morning reveal", () => {
  it("marks levels, classes and Skills", () => {
    expect(lineKind("[Rider Level 3!]")).toBe("level");
    expect(lineKind("[Rider Class obtained!]")).toBe("class");
    expect(lineKind("[Class evolution available!]")).toBe("class");
    expect(lineKind("[Skill – Second Wind obtained!]")).toBe("skill");
    expect(lineKind("[Grace – Biking kept]")).toBe("plain");
  });

  it("plays the current morning once per phone", () => {
    const today = "2027-01-05";
    expect(shouldReveal("2027-01-04", null, today)).toBe(true);
    expect(shouldReveal("2027-01-05", "2027-01-04", today)).toBe(true);
    expect(shouldReveal("2027-01-04", "2027-01-04", today)).toBe(false);
    expect(shouldReveal("2027-01-02", null, today)).toBe(false);
    expect(shouldReveal(undefined, null, today)).toBe(false);
  });
});
