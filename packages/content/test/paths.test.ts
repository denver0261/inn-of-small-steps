import { describe, expect, it } from "vitest";
import { CLASS_PATHS, classPath } from "../src/index.ts";

describe("class paths", () => {
  it("has the 9 base paths from the design, with unique ids", () => {
    expect(CLASS_PATHS).toHaveLength(9);
    expect(new Set(CLASS_PATHS.map((p) => p.id)).size).toBe(9);
  });

  it("looks paths up by id", () => {
    expect(classPath("chef").focusDomains).toEqual(["nourish"]);
    expect(() => classPath("innkeeper")).toThrow();
  });
});
