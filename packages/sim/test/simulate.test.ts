import { describe, expect, it } from "vitest";
import { report, simulateAll } from "../src/simulate.ts";

describe("the 365-day simulator", () => {
  const results = simulateAll();

  it("is deterministic", () => {
    expect(report(simulateAll())).toBe(report(results));
  });

  it("keeps the design's pacing: steady play reaches Level 10 in about 7 weeks", () => {
    const steady = results.find((r) => r.id === "steady");
    const day = steady?.dayReached[10] ?? Infinity;
    expect(day / 7).toBeGreaterThanOrEqual(6);
    expect(day / 7).toBeLessThanOrEqual(8);
  });

  it("makes a bad stretch cost progress, never wipe it", () => {
    for (const r of results) {
      for (let m = 1; m < r.levelByMonth.length; m++) expect(r.levelByMonth[m]).toBeGreaterThanOrEqual(r.levelByMonth[m - 1] ?? 0);
      expect(r.dayReached[10]).toBeDefined();
    }
  });

  // A balance change shows up here as a reviewable diff. Update with `pnpm test -u`
  // only when the change is intended, and say why in docs/decisions/.
  it("matches the recorded level curve", () => {
    expect(report(results)).toMatchSnapshot();
  });
});
