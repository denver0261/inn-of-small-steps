import { BASE_BODY, HAIR_COLORS, OUTFITS, SPRITE_PALETTE, type Outfit } from "@inn/content";

/** A drawn character: rows of colors, null where it's see-through. */
export type Pixels = (string | null)[][];

/** A stable pick from a list, so a player keeps the same hair on every phone. */
export function pickFor<T>(id: string, list: readonly T[]): T {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  const v = list[h % list.length];
  if (v === undefined) throw new Error("empty list");
  return v;
}

/** The outfit for a class path, or the Earther's plain clothes. */
export function outfitFor(classPathId: string | null | undefined): Outfit {
  return (classPathId && OUTFITS[classPathId]) || (OUTFITS.earther as Outfit);
}

/** The base body under the class outfit, as colors. Unknown keys throw, so a typo in the art fails tests. */
export function composeCharacter(classPathId: string | null | undefined, hair: string): Pixels {
  const outfit = outfitFor(classPathId);
  const colors: Record<string, string> = { ...SPRITE_PALETTE, ...outfit.colors, h: hair };
  return BASE_BODY.map((row, y) => {
    const over = outfit.overlay[y];
    return [...row].map((ch, x) => {
      const key = over && over[x] !== "." && over[x] !== undefined ? over[x] : ch;
      if (key === ".") return null;
      const c = colors[key];
      if (!c) throw new Error(`no color for "${key}" at ${x},${y}`);
      return c;
    });
  });
}

/** A character for a player: their class outfit and their hair. */
export function playerSprite(player: { id: string; class_path_id: string | null }): Pixels {
  return composeCharacter(player.class_path_id, pickFor(player.id, HAIR_COLORS));
}

/** Runs of one color along a row, so a row draws as a few blocks instead of 16. */
export function runs(row: readonly (string | null)[]): { color: string | null; length: number }[] {
  const out: { color: string | null; length: number }[] = [];
  for (const c of row) {
    const last = out[out.length - 1];
    if (last && last.color === c) last.length++;
    else out.push({ color: c, length: 1 });
  }
  return out;
}
