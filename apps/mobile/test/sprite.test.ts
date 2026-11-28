import { BASE_BODY, CLASS_PATHS, OUTFITS, SPRITE_HEIGHT, SPRITE_WIDTH } from "@inn/content";
import { describe, expect, it } from "vitest";
import { composeCharacter, outfitFor, pickFor, playerSprite, runs } from "../src/game/sprite.ts";

describe("pixel characters", () => {
  it("draws the base body and every overlay row at full width", () => {
    expect(BASE_BODY).toHaveLength(SPRITE_HEIGHT);
    for (const row of BASE_BODY) expect(row).toHaveLength(SPRITE_WIDTH);
    for (const [id, outfit] of Object.entries(OUTFITS)) {
      for (const [y, row] of Object.entries(outfit.overlay)) {
        expect(row, `${id} row ${y}`).toHaveLength(SPRITE_WIDTH);
        expect(Number(y)).toBeLessThan(SPRITE_HEIGHT);
      }
    }
  });

  it("dresses every class path, with every pixel a known color", () => {
    for (const path of CLASS_PATHS) {
      expect(OUTFITS[path.id], path.id).toBeDefined();
      const px = composeCharacter(path.id, "#000000");
      expect(px).toHaveLength(SPRITE_HEIGHT);
      expect(px.every((r) => r.length === SPRITE_WIDTH)).toBe(true);
    }
  });

  it("gives a player without a class the Earther's clothes, and the same hair every time", () => {
    expect(outfitFor(null)).toBe(OUTFITS.earther);
    expect(outfitFor("innkeeper")).toBe(OUTFITS.earther);
    const p = { id: "5cca6c9b-9a8e-4d63-bd3c-cda8c516d1a9", class_path_id: "rider" };
    expect(playerSprite(p)).toEqual(playerSprite(p));
    expect(pickFor("a", [1, 2, 3])).toBe(pickFor("a", [1, 2, 3]));
  });

  it("the outfit changes the cloth, the overlay sits on top", () => {
    const rider = composeCharacter("rider", "#000000");
    expect(rider[15]?.[7]).toBe(OUTFITS.rider?.colors.c);
    expect(rider[10]?.[6]).toBe("#a33b2b");
    expect(rider[0]?.[0]).toBeNull();
  });

  it("merges a row into runs of one color", () => {
    expect(runs([null, null, "a", "a", "b"])).toEqual([
      { color: null, length: 2 },
      { color: "a", length: 2 },
      { color: "b", length: 1 },
    ]);
  });
});
